// JavaScript Principal - Hub Gamificado (Versão: Loja Avançada + Tarefas)

// Inicialização
document.addEventListener('DOMContentLoaded', () => console.log('App pronto.'));

window.initializeApp = function() {
    loadRealRanking();
    loadRealActivities();
    loadTasks();
    // A loja carrega sob demanda ao clicar no menu
}

// === 1. RANKING & ATIVIDADES ===
async function loadRealRanking() {
    const div = document.getElementById('topStudents');
    if(!div || !window.db) return;

    try {
        const q = window.query(window.collection(window.db, "users"), window.orderBy("experience", "desc"), window.limit(5));
        const snapshot = await window.getDocs(q);
        
        let html = '';
        let pos = 1;

        if (snapshot.empty) { div.innerHTML = '<div class="text-center text-muted">Sem dados.</div>'; return; }

        snapshot.forEach((doc) => {
            const u = doc.data();
            const isMe = (window.auth.currentUser?.uid === doc.id);
            const badge = isMe ? 'bg-warning text-dark' : 'bg-primary';
            const bg = isMe ? 'border border-warning bg-light' : 'border-bottom';
            
            html += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 ${bg} rounded">
                    <div><strong>#${pos} ${u.name || 'Aluno'}</strong></div>
                    <span class="badge ${badge}">${u.experience || 0} XP</span>
                </div>`;
            pos++;
        });
        div.innerHTML = html;
    } catch (e) { console.error(e); }
}

function loadRealActivities() {
    const list = document.getElementById('activityList');
    if(list) list.innerHTML = '<div class="text-center text-muted small">Suas conquistas aparecerão aqui.</div>';
}

// === 2. SISTEMA DE TAREFAS (ALUNO) ===
async function loadTasks() {
    const list = document.getElementById('taskList');
    if (!list || !window.db) return;

    try {
        const userId = window.auth.currentUser.uid;
        
        // Tarefas
        const tasksSnap = await window.getDocs(window.query(window.collection(window.db, "tasks"), window.orderBy("dueDate", "asc")));
        
        // Entregas do aluno
        const subsSnap = await window.getDocs(window.query(
            window.collection(window.db, "submissions"), 
            window.where("userId", "==", userId)
        ));
        
        const mySubs = {};
        subsSnap.forEach(d => mySubs[d.data().taskId] = d.data().status);

        let html = '';
        let pendentes = 0;

        tasksSnap.forEach((doc) => {
            const t = doc.data();
            const status = mySubs[doc.id];
            const date = t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : 'S/ Data';

            let btn = `<button class="btn btn-primary btn-sm" onclick="submitTask('${doc.id}', '${t.title}')">Entregar</button>`;
            let badge = '';

            if (status === 'approved') {
                badge = '<span class="badge bg-success ms-2">Feita</span>';
                btn = '';
            } else if (status === 'pending') {
                badge = '<span class="badge bg-warning text-dark ms-2">Analisando</span>';
                btn = '<button class="btn btn-secondary btn-sm" disabled>Enviada</button>';
            } else {
                if (status === 'rejected') badge = '<span class="badge bg-danger ms-2">Refazer</span>';
                pendentes++;
            }

            html += `
                <div class="list-group-item p-3 mb-2 shadow-sm rounded">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1 text-primary">${t.title} ${badge}</h5>
                            <small class="text-muted">${t.description} • 📅 ${date}</small>
                        </div>
                        <div class="text-end">
                            <div class="mb-2">
                                <span class="badge bg-light text-dark border">+${t.xp} XP</span>
                                <span class="badge bg-light text-dark border">+${t.coins} $</span>
                            </div>
                            ${btn}
                        </div>
                    </div>
                </div>`;
        });

        list.innerHTML = html || '<div class="p-4 text-center">Nenhuma missão ativa.</div>';
        const counter = document.getElementById('taskCount');
        if(counter) counter.innerText = `${pendentes} pendentes`;

    } catch (e) { console.error(e); }
}

window.submitTask = async function(taskId, title) {
    const just = prompt("Confirmação (Escreva 'Feito' ou cole um link):");
    if (!just) return;

    try {
        const uid = window.auth.currentUser.uid;
        const name = window.userData?.name || "Aluno";
        
        await window.setDoc(window.doc(window.db, "submissions", `${uid}_${taskId}`), {
            taskId, userId: uid, studentName: name, taskTitle: title,
            justification: just, status: 'pending', submittedAt: new Date().toISOString()
        });
        
        alert("Enviado para o professor!");
        loadTasks();
    } catch (e) { alert("Erro ao enviar."); }
}

// === 3. SISTEMA DE LOJA AVANÇADO (Estoque + Inflação + Pedidos) ===

window.loadStore = async function() {
    const storeList = document.getElementById('storeList');
    const storeBalance = document.getElementById('storeBalance');
    
    // Atualiza saldo visual
    if (window.userData && storeBalance) {
        storeBalance.innerHTML = `<i class="fas fa-coins"></i> ${window.userData.coins || 0}`;
    }

    if (!storeList || !window.db) return;

    try {
        const q = window.query(window.collection(window.db, "shop_items"), window.orderBy("price", "asc"));
        const snapshot = await window.getDocs(q);

        if (snapshot.empty) {
            storeList.innerHTML = '<div class="col-12 text-center text-muted">Loja vazia.</div>';
            return;
        }

        const inventory = window.userData?.inventory || [];
        let html = '';
        
        snapshot.forEach((doc) => {
            const item = doc.data();
            const itemId = doc.id;
            const price = Math.ceil(item.price); 
            const stock = (item.stock !== undefined) ? item.stock : 99;
            
            const userCoins = window.userData?.coins || 0;
            const alreadyOwns = inventory.includes(itemId);
            
            // Lógica do Botão
            let btnHtml = '';
            let stockBadge = stock < 5 ? `<span class="badge bg-danger mb-2">Restam ${stock}!</span>` : `<span class="badge bg-secondary mb-2">Estoque: ${stock}</span>`;

            if (stock <= 0) {
                 btnHtml = `<button class="btn btn-secondary w-100" disabled>Esgotado</button>`;
                 stockBadge = `<span class="badge bg-dark mb-2">Esgotado</span>`;
            } else if (alreadyOwns && item.type !== 'consumable') {
                btnHtml = `<button class="btn btn-secondary w-100" disabled><i class="fas fa-check"></i> Comprado</button>`;
            } else if (userCoins < price) {
                btnHtml = `<button class="btn btn-outline-danger w-100" disabled>Faltam ${price - userCoins} 💰</button>`;
            } else {
                btnHtml = `
                    <button class="btn btn-success w-100" onclick="buyItem('${itemId}', '${item.name}', ${price})">
                        Comprar por ${price}
                    </button>`;
            }

            html += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm border-0 position-relative">
                        <div class="card-body text-center">
                            ${stockBadge}
                            <div class="display-4 mb-3">${item.icon || '🎁'}</div>
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text text-muted small">${item.description}</p>
                            
                            <h4 class="text-warning fw-bold my-3">${price} 💰</h4>
                            ${btnHtml}
                        </div>
                    </div>
                </div>
            `;
        });

        storeList.innerHTML = html;

    } catch (e) { console.error("Erro loja:", e); }
}

window.buyItem = async function(itemId, itemName, currentPrice) {
    if (!confirm(`Confirmar compra de "${itemName}" por ${currentPrice} moedas?`)) return;

    try {
        const userId = window.auth.currentUser.uid;
        const userName = window.userData?.name || "Aluno";
        const userRef = window.doc(window.db, "users", userId);
        const itemRef = window.doc(window.db, "shop_items", itemId);

        // 1. Verificar dados ATUAIS do item
        const itemSnap = await window.getDoc(itemRef);
        const itemData = itemSnap.data();
        
        if (itemData.stock !== undefined && itemData.stock <= 0) {
            alert("Ops! Esse item acabou de esgotar.");
            loadStore();
            return;
        }

        const realPrice = Math.ceil(itemData.price);
        const userSnap = await window.getDoc(userRef);
        const userCoins = userSnap.data().coins || 0;

        if (userCoins < realPrice) {
            alert("Saldo insuficiente! O preço pode ter subido.");
            loadStore();
            return;
        }

        // === TRANSAÇÃO DE COMPRA ===
        
        // A. Descontar do Usuário e dar o item
        await window.updateDoc(userRef, {
            coins: userCoins - realPrice,
            inventory: window.arrayUnion(itemId)
        });

        // B. Criar PEDIDO para o Professor (orders)
        await window.addDoc(window.collection(window.db, "orders"), {
            userId: userId,
            studentName: userName,
            itemId: itemId,
            itemName: itemName,
            pricePaid: realPrice,
            status: "pending_delivery", 
            purchasedAt: new Date().toISOString()
        });

        // C. Atualizar a Loja (Reduzir Estoque e Aumentar Preço)
        const inflationRate = itemData.inflation || 0; 
        const newPrice = realPrice + (realPrice * inflationRate);
        const newStock = (itemData.stock !== undefined) ? itemData.stock - 1 : 99;

        await window.updateDoc(itemRef, {
            stock: newStock,
            price: newPrice
        });

        alert(`🎉 Compra realizada com sucesso!\nO item foi adicionado aos seus pedidos.`);
        
        // Atualizar visual local
        if (window.userData) {
            window.userData.coins = userCoins - realPrice;
            if(!window.userData.inventory) window.userData.inventory = [];
            window.userData.inventory.push(itemId);
        }
        
        loadStore();
        if(window.updateUserInterface) window.updateUserInterface();

    } catch (e) {
        console.error("Erro compra:", e);
        alert("Erro ao processar compra. Tente novamente.");
    }
}

// === PAINEL DO PROFESSOR (ADMIN) - Tarefas ===

window.createTask = async function() {
    const title = document.getElementById('taskTitle').value;
    const desc = document.getElementById('taskDesc').value;
    const xp = parseInt(document.getElementById('taskXP').value);
    const coins = parseInt(document.getElementById('taskCoins').value);
    const date = document.getElementById('taskDate').value;

    if(!title) return alert("Preencha o título!");

    try {
        await window.addDoc(window.collection(window.db, "tasks"), {
            title, description: desc, xp, coins, dueDate: date, createdAt: new Date().toISOString()
        });
        alert("Missão criada!");
        document.getElementById('taskTitle').value = ''; 
        loadTasks(); 
    } catch (e) { alert("Erro: " + e.message); }
}

window.loadPendingSubmissions = async function() {
    const list = document.getElementById('submissionsList');
    if(!list) return;

    try {
        const q = window.query(window.collection(window.db, "submissions"), window.where("status", "==", "pending"));
        const snapshot = await window.getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = '<div class="p-4 text-center text-muted">Tudo limpo! Nenhuma entrega pendente.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const s = doc.data();
            html += `
                <div class="list-group-item p-3">
                    <div class="d-flex w-100 justify-content-between">
                        <h6 class="mb-1 fw-bold">${s.studentName}</h6>
                        <small class="text-muted">${new Date(s.submittedAt).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1">Missão: <span class="text-primary">${s.taskTitle}</span></p>
                    <div class="alert alert-secondary p-2 mb-2 small"><i class="fas fa-quote-left me-2"></i>${s.justification}</div>
                    
                    <div class="d-flex gap-2">
                        <button class="btn btn-success btn-sm flex-grow-1" onclick="approveSubmission('${doc.id}', '${s.taskId}', '${s.userId}')">
                            <i class="fas fa-check"></i> Aprovar
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="rejectSubmission('${doc.id}')">
                            <i class="fas fa-times"></i> Rejeitar
                        </button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;
    } catch (e) { console.error("Erro admin:", e); list.innerHTML = 'Erro ao carregar.'; }
}

window.approveSubmission = async function(subId, taskId, userId) {
    if(!confirm("Aprovar e dar os pontos?")) return;
    try {
        const taskDoc = await window.getDoc(window.doc(window.db, "tasks", taskId));
        const xpReward = taskDoc.data().xp || 0;
        const coinsReward = taskDoc.data().coins || 0;

        const userRef = window.doc(window.db, "users", userId);
        const userSnap = await window.getDoc(userRef);
        const userData = userSnap.data();

        const newXP = (userData.experience || 0) + xpReward;
        const newCoins = (userData.coins || 0) + coinsReward;
        const newLevel = Math.floor(newXP / 100) + 1;

        await window.updateDoc(userRef, { experience: newXP, coins: newCoins, level: newLevel });
        await window.updateDoc(window.doc(window.db, "submissions", subId), { status: 'approved' });

        alert(`Aprovado! Aluno ganhou ${xpReward} XP.`);
        loadPendingSubmissions();
    } catch (e) { alert("Erro ao aprovar."); }
}

window.rejectSubmission = async function(subId) {
    if(!confirm("Rejeitar esta entrega?")) return;
    try {
        await window.updateDoc(window.doc(window.db, "submissions", subId), { status: 'rejected' });
        loadPendingSubmissions();
    } catch (e) { alert("Erro ao rejeitar."); }
}

// === GESTÃO DE PEDIDOS DA LOJA (ADMIN) ===

// 1. Carregar Pedidos Pendentes
window.loadPendingOrders = async function() {
    const list = document.getElementById('ordersList');
    if(!list || !window.db) return;

    try {
        // Busca pedidos com status 'pending_delivery'
        const q = window.query(
            window.collection(window.db, "orders"), 
            window.where("status", "==", "pending_delivery")
        );
        const snapshot = await window.getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = '<div class="p-4 text-center text-muted">Nenhum pedido pendente de entrega.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const dataCompra = new Date(order.purchasedAt).toLocaleDateString('pt-BR');
            
            html += `
                <div class="list-group-item p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${order.studentName} <span class="badge bg-light text-dark border ms-2">${dataCompra}</span></div>
                        <div class="text-muted small">Comprou: <span class="text-success fw-bold" style="font-size: 1.1em;">${order.itemName}</span></div>
                        <div class="small text-secondary">Pagou: ${order.pricePaid} moedas</div>
                    </div>
                    <button class="btn btn-success btn-sm px-3" onclick="deliverOrder('${doc.id}', '${order.itemName}')">
                        <i class="fas fa-check-circle me-1"></i> Marcar Entregue
                    </button>
                </div>
            `;
        });
        list.innerHTML = html;

    } catch (e) {
        console.error("Erro pedidos:", e);
        list.innerHTML = '<div class="p-4 text-center text-danger">Erro ao carregar pedidos.</div>';
    }
}

// 2. Marcar Pedido como Entregue
window.deliverOrder = async function(orderId, itemName) {
    if(!confirm(`Confirmar a entrega do item "${itemName}" para o aluno?`)) return;

    try {
        // Atualiza status para 'delivered'
        await window.updateDoc(window.doc(window.db, "orders", orderId), { 
            status: 'delivered', 
            deliveredAt: new Date().toISOString() 
        });

        alert("Item marcado como entregue! O pedido saiu da lista.");
        loadPendingOrders(); // Atualiza a lista
        
    } catch (e) {
        console.error(e);
        alert("Erro ao atualizar pedido.");
    }
}

// Exportações
window.loadTasks = loadTasks;
window.loadRealRanking = loadRealRanking;
window.createTask = createTask;
window.loadPendingSubmissions = loadPendingSubmissions;
window.approveSubmission = approveSubmission;
window.rejectSubmission = rejectSubmission;
window.loadStore = loadStore;
window.loadPendingOrders = loadPendingOrders;
window.deliverOrder = deliverOrder;
