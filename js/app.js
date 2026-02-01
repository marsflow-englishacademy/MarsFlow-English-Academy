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

// === GESTÃO DE PEDIDOS DA LOJA (ATUALIZADO COM ESTORNO) ===

// 1. Carregar Pedidos Pendentes (Com botão de Cancelar)
window.loadPendingOrders = async function() {
    const list = document.getElementById('ordersList');
    if(!list || !window.db) return;

    try {
        const q = window.query(
            window.collection(window.db, "orders"), 
            window.where("status", "==", "pending_delivery")
        );
        const snapshot = await window.getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = '<div class="p-4 text-center text-muted">Nenhum pedido pendente.</div>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const order = doc.data();
            const dataCompra = new Date(order.purchasedAt).toLocaleDateString('pt-BR');
            const itemId = order.itemId || ''; // Garante que temos o ID do item
            
            html += `
                <div class="list-group-item p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${order.studentName} <span class="badge bg-light text-dark border ms-2">${dataCompra}</span></div>
                        <div class="text-muted small">Item: <span class="text-success fw-bold">${order.itemName}</span></div>
                        <div class="small text-secondary">Valor Pago: ${order.pricePaid} moedas</div>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-outline-danger btn-sm" onclick="cancelOrder('${doc.id}', '${order.userId}', ${order.pricePaid}, '${order.itemName}', '${itemId}')">
                            <i class="fas fa-undo"></i> Estornar
                        </button>
                        <button class="btn btn-success btn-sm" onclick="deliverOrder('${doc.id}', '${order.itemName}')">
                            <i class="fas fa-check"></i> Entregar
                        </button>
                    </div>
                </div>
            `;
        });
        list.innerHTML = html;

    } catch (e) {
        console.error("Erro pedidos:", e);
        list.innerHTML = '<div class="p-4 text-center text-danger">Erro ao carregar pedidos.</div>';
    }
}

// 2. Entregar Pedido (Mantido)
window.deliverOrder = async function(orderId, itemName) {
    if(!confirm(`Confirmar entrega de "${itemName}"?`)) return;
    try {
        await window.updateDoc(window.doc(window.db, "orders", orderId), { 
            status: 'delivered', 
            deliveredAt: new Date().toISOString() 
        });
        alert("Entregue!");
        loadPendingOrders();
    } catch (e) { alert("Erro ao entregar."); }
}

// 3. CANCELAR E ESTORNAR (NOVO)
window.cancelOrder = async function(orderId, userId, pricePaid, itemName, itemId) {
    if(!confirm(`⚠️ ATENÇÃO:\n\nDeseja cancelar o pedido de "${itemName}"?\nIsso vai devolver ${pricePaid} moedas para o aluno e remover o item do inventário dele.`)) return;

    try {
        const userRef = window.doc(window.db, "users", userId);
        
        // A. Buscar saldo atual do aluno para somar
        const userSnap = await window.getDoc(userRef);
        if (!userSnap.exists()) return alert("Aluno não encontrado!");
        
        const currentCoins = userSnap.data().coins || 0;

        // B. Devolver dinheiro e remover item
        await window.updateDoc(userRef, {
            coins: currentCoins + pricePaid,       // Devolve o dinheiro
            inventory: window.arrayRemove(itemId)  // Remove o item
        });

        // C. Marcar pedido como Cancelado
        await window.updateDoc(window.doc(window.db, "orders", orderId), {
            status: 'cancelled',
            cancelledAt: new Date().toISOString()
        });
        
        // Opcional: Se quiser devolver ao estoque da loja, precisaria atualizar o item também.
        // Por enquanto, vamos focar no estorno financeiro.

        alert(`✅ Pedido cancelado!\nO aluno recebeu ${pricePaid} moedas de volta.`);
        loadPendingOrders(); // Atualiza a lista

    } catch (e) {
        console.error(e);
        alert("Erro ao cancelar pedido: " + e.message);
    }
}

// === GESTÃO DE COMPORTAMENTO (REGRAS & AJUSTES) ===

// 1. Carregar Lista de Alunos para o Select
window.loadStudentsForAdmin = async function() {
    const select = document.getElementById('studentSelect');
    if (!select || !window.db) return;

    try {
        const q = window.query(window.collection(window.db, "users"), window.orderBy("name"));
        const snapshot = await window.getDocs(q);

        let html = '<option value="" selected disabled>Selecione um aluno...</option>';
        
        snapshot.forEach(doc => {
            const u = doc.data();
            // Mostra nome e saldo atual para facilitar
            html += `<option value="${doc.id}">${u.name || 'Sem Nome'} (💰${u.coins || 0} | ⭐${u.experience || 0})</option>`;
        });

        select.innerHTML = html;
    } catch (e) { console.error("Erro ao carregar alunos:", e); }
}

// 2. Criar Nova Regra
window.createRule = async function() {
    const name = document.getElementById('ruleName').value;
    const xp = parseInt(document.getElementById('ruleXP').value) || 0;
    const coins = parseInt(document.getElementById('ruleCoins').value) || 0;
    const type = document.getElementById('ruleType').value;

    if (!name) return alert("Dê um nome para a regra!");

    try {
        await window.addDoc(window.collection(window.db, "rules"), {
            name, xp, coins, type, createdAt: new Date().toISOString()
        });
        
        alert("Regra criada!");
        document.getElementById('ruleName').value = ''; // Limpar form
        loadRules(); // Recarregar lista
    } catch (e) { alert("Erro ao criar regra."); }
}

// 3. Carregar Regras Existentes (Botões)
window.loadRules = async function() {
    const list = document.getElementById('rulesList');
    if (!list) return;

    try {
        const q = window.query(window.collection(window.db, "rules"), window.orderBy("createdAt", "desc"));
        const snapshot = await window.getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = '<span class="text-muted small">Nenhuma regra criada ainda.</span>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const r = doc.data();
            // Define cor do botão (Verde para ganho, Vermelho para perda)
            const btnClass = r.type === 'positive' ? 'btn-outline-success' : 'btn-outline-danger';
            const icon = r.type === 'positive' ? 'fas fa-plus-circle' : 'fas fa-minus-circle';
            const values = `(XP: ${r.xp > 0 ? '+' : ''}${r.xp} | 💰: ${r.coins > 0 ? '+' : ''}${r.coins})`;

            html += `
                <button class="btn ${btnClass} btn-sm mb-2" onclick="applyRuleToStudent('${r.name}', ${r.xp}, ${r.coins})">
                    <i class="${icon}"></i> ${r.name} <small>${values}</small>
                </button>
            `;
        });
        list.innerHTML = html;

    } catch (e) { console.error("Erro regras:", e); }
}

// 4. Aplicar Regra (Ao clicar no botão)
window.applyRuleToStudent = async function(ruleName, xp, coins) {
    const studentId = document.getElementById('studentSelect').value;
    if (!studentId) return alert("Primeiro selecione um aluno na lista!");

    if (!confirm(`Aplicar "${ruleName}" ao aluno selecionado?\nIsso vai alterar XP em ${xp} e Moedas em ${coins}.`)) return;

    await updateUserStats(studentId, xp, coins, `Regra: ${ruleName}`);
}

// 5. Ajuste Manual (Formulário)
window.applyManualAdjustment = async function() {
    const studentId = document.getElementById('studentSelect').value;
    const xp = parseInt(document.getElementById('manualXP').value) || 0;
    const coins = parseInt(document.getElementById('manualCoins').value) || 0;
    const reason = document.getElementById('manualReason').value;

    if (!studentId) return alert("Selecione um aluno!");
    if (xp === 0 && coins === 0) return alert("Insira algum valor de XP ou Moedas.");
    if (!reason) return alert("Escreva um motivo para o histórico.");

    await updateUserStats(studentId, xp, coins, `Ajuste Manual: ${reason}`);
    
    // Limpar form
    document.getElementById('manualXP').value = '';
    document.getElementById('manualCoins').value = '';
    document.getElementById('manualReason').value = '';
}

// FUNÇÃO AUXILIAR CENTRAL: Atualiza o banco e notifica
async function updateUserStats(userId, xpDelta, coinsDelta, reason) {
    try {
        const userRef = window.doc(window.db, "users", userId);
        const userSnap = await window.getDoc(userRef);
        
        if (!userSnap.exists()) return alert("Aluno não encontrado.");
        
        const currentData = userSnap.data();
        const newXP = (currentData.experience || 0) + xpDelta;
        const newCoins = (currentData.coins || 0) + coinsDelta;
        // Recalcula nível (Ex: a cada 100 xp sobe 1 nivel)
        const newLevel = Math.floor(newXP / 100) + 1;

        // 1. Atualiza Usuário
        await window.updateDoc(userRef, {
            experience: newXP,
            coins: newCoins,
            level: newLevel
        });

        // 2. Opcional: Registrar no histórico (transações) se quiser auditoria
        // await window.addDoc(window.collection(window.db, "transactions"), { ... })

        alert(`Sucesso! ${reason}\nNovo Saldo: ${newCoins} 💰 | ${newXP} XP`);
        
        // Recarrega lista para atualizar os saldos visuais no dropdown
        loadStudentsForAdmin();

    } catch (e) {
        console.error(e);
        alert("Erro ao atualizar aluno.");
    }
}

// === SISTEMA DE GESTÃO ESCOLAR (Turmas e Relações) ===

// 1. Criar Nova Turma (Apenas Admin/Teacher/Dev)
window.createClass = async function(className) {
    if (!['admin', 'developer', 'teacher'].includes(window.userData.role)) {
        return alert("Sem permissão.");
    }

    try {
        const classRef = await window.addDoc(window.collection(window.db, "classes"), {
            name: className,
            teacherId: window.auth.currentUser.uid, // Quem criou é o professor responsável
            studentIds: [],
            createdAt: new Date().toISOString()
        });

        // Atualiza o professor para incluir essa turma na lista dele
        await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), {
            myClasses: window.arrayUnion(classRef.id)
        });

        alert(`Turma "${className}" criada com ID: ${classRef.id}`);
        console.log("Class ID:", classRef.id);
        return classRef.id;
    } catch (e) { console.error(e); alert("Erro ao criar turma."); }
}

// 2. Adicionar Aluno à Turma
window.addStudentToClass = async function(studentEmail, classId) {
    // Busca o aluno pelo email (precisamos fazer uma query pois não sabemos o ID)
    try {
        const q = window.query(window.collection(window.db, "users"), window.where("email", "==", studentEmail));
        const querySnapshot = await window.getDocs(q);

        if (querySnapshot.empty) return alert("Aluno não encontrado com este email.");

        const studentDoc = querySnapshot.docs[0];
        const studentId = studentDoc.id;

        // 1. Atualiza o Aluno (adiciona classId)
        await window.updateDoc(window.doc(window.db, "users", studentId), {
            classId: classId,
            role: 'student' // Garante que é aluno
        });

        // 2. Atualiza a Turma (adiciona studentId na lista)
        await window.updateDoc(window.doc(window.db, "classes", classId), {
            studentIds: window.arrayUnion(studentId)
        });

        alert(`Aluno ${studentEmail} adicionado à turma!`);

    } catch (e) { console.error(e); alert("Erro ao vincular aluno."); }
}

// 3. Vincular Pai ao Filho
window.linkParentToChild = async function(parentEmail, childEmail) {
    try {
        // Busca Pai
        const qPai = window.query(window.collection(window.db, "users"), window.where("email", "==", parentEmail));
        const snapPai = await window.getDocs(qPai);
        if (snapPai.empty) return alert("Email do PAI não encontrado.");
        
        // Busca Filho
        const qFilho = window.query(window.collection(window.db, "users"), window.where("email", "==", childEmail));
        const snapFilho = await window.getDocs(qFilho);
        if (snapFilho.empty) return alert("Email do FILHO não encontrado.");

        const paiId = snapPai.docs[0].id;
        const filhoId = snapFilho.docs[0].id;

        // Atualiza Pai (adiciona filho na lista)
        await window.updateDoc(window.doc(window.db, "users", paiId), {
            childrenIds: window.arrayUnion(filhoId),
            role: 'parent' // Garante role de pai
        });

        // Atualiza Filho (adiciona id do pai)
        await window.updateDoc(window.doc(window.db, "users", filhoId), {
            parentId: paiId
        });

        alert("Vínculo familiar criado com sucesso!");

    } catch (e) { console.error(e); alert("Erro no vínculo familiar."); }
}

// 4. Função Mágica para virar Desenvolvedor (Rode no console)
window.becomeDeveloper = async function() {
    if(!window.auth.currentUser) return;
    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), {
        role: 'developer'
    });
    alert("Você agora é um Desenvolvedor! Recarregue a página.");
}

// === SISTEMA DE COMUNICAÇÃO E TURMAS (ETAPA 2) ===

// 1. Carregar Turmas do Professor (Para lista e select)
window.loadTeacherClasses = async function() {
    const listDiv = document.getElementById('classList');
    const selectTarget = document.getElementById('notifTarget');
    
    if (!window.db || !window.auth.currentUser) return;

    try {
        // Se for admin/dev, vê todas. Se for professor, vê as dele.
        let q;
        if (window.userData.role === 'admin' || window.userData.role === 'developer') {
            q = window.query(window.collection(window.db, "classes"));
        } else {
            q = window.query(window.collection(window.db, "classes"), window.where("teacherId", "==", window.auth.currentUser.uid));
        }

        const snapshot = await window.getDocs(q);
        
        // Limpar lista e select (mantendo a opção "Todas")
        listDiv.innerHTML = '';
        selectTarget.innerHTML = '<option value="all">📢 Todas as Turmas</option>';

        if (snapshot.empty) {
            listDiv.innerHTML = '<div class="p-3 text-center text-muted">Você não tem turmas.</div>';
            return;
        }

        snapshot.forEach(doc => {
            const turma = doc.data();
            const alunoCount = turma.studentIds ? turma.studentIds.length : 0;
            
            // Adicionar na lista lateral
            listDiv.innerHTML += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${turma.name}</strong><br>
                        <small class="text-muted">ID: ${doc.id}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">${alunoCount} 👤</span>
                </div>
            `;

            // Adicionar no Select de notificação
            const option = document.createElement('option');
            option.value = doc.id;
            option.text = `Turma: ${turma.name}`;
            selectTarget.appendChild(option);
        });

    } catch (e) { console.error("Erro ao carregar turmas:", e); }
}

// 2. Criar Nova Turma (Botão Visual)
window.createNewClassPrompt = async function() {
    const className = prompt("Nome da nova turma (Ex: 8º Ano B):");
    if (!className) return;
    
    // Reutiliza a função que criamos na Etapa 1
    await window.createClass(className);
    loadTeacherClasses(); // Atualiza a lista
}

// 3. Enviar Notificação
window.sendNotification = async function() {
    const title = document.getElementById('notifTitle').value;
    const message = document.getElementById('notifMessage').value;
    const target = document.getElementById('notifTarget').value;
    const type = document.getElementById('notifType').value;
    const urgency = document.getElementById('notifUrgency').value;

    if (!title || !message) return alert("Preencha título e mensagem!");

    try {
        const notifData = {
            title: title,
            content: message,
            type: type,         // homework, test, event...
            urgency: urgency,   // chill, attention, urgent
            targetId: target,   // 'all' ou ID da turma
            senderId: window.auth.currentUser.uid,
            senderName: window.userData.name || "Professor",
            readBy: [],         // Lista de quem já leu
            createdAt: new Date().toISOString()
        };

        await window.addDoc(window.collection(window.db, "notifications"), notifData);

        alert("📢 Notificação enviada com sucesso!");
        
        // Limpar formulário
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
    } catch (e) {
        console.error(e);
        alert("Erro ao enviar notificação.");
    }
}

// === ETAPA 3: INTERFACE DO ALUNO (Notificações e Ranking Avançado) ===

// 1. RANKING: Alternar entre Geral e Turma
window.currentRankingMode = 'general';

window.switchRanking = function(mode) {
    window.currentRankingMode = mode;
    
    // Atualiza visual das abas
    document.getElementById('tabGeneral').className = mode === 'general' ? 'nav-link active fw-bold' : 'nav-link text-dark';
    document.getElementById('tabClass').className = mode === 'class' ? 'nav-link active fw-bold' : 'nav-link text-dark';
    
    // Recarrega dados
    loadRealRanking();
}

// Substituição da função loadRealRanking original para suportar filtro
window.loadRealRanking = async function() {
    const tbody = document.getElementById('tabelaRankingCompleta');
    if(!tbody || !window.db) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        let q;
        const usersRef = window.collection(window.db, "users");

        // Atualiza badge da turma
        const classBadge = document.getElementById('myClassBadge');
        if(classBadge) classBadge.innerText = window.userData.classId ? "Turma Vinculada" : "Sem Turma";

        if (window.currentRankingMode === 'class') {
            if (!window.userData.classId) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">Você não está em nenhuma turma.</td></tr>';
                return;
            }
            // Filtra apenas alunos da mesma turma
            q = window.query(usersRef, window.where("classId", "==", window.userData.classId), window.orderBy("experience", "desc"), window.limit(50));
        } else {
            // Ranking Geral
            q = window.query(usersRef, window.orderBy("experience", "desc"), window.limit(50));
        }

        const snapshot = await window.getDocs(q);
        let html = '';
        let posicao = 1;

        snapshot.forEach(doc => {
            const u = doc.data();
            const isMe = (window.auth.currentUser.uid === doc.id);
            const rowClass = isMe ? 'table-primary fw-bold' : '';
            
            // Ícones de medalha
            let posDisplay = posicao;
            if (posicao === 1) posDisplay = '🥇';
            if (posicao === 2) posDisplay = '🥈';
            if (posicao === 3) posDisplay = '🥉';

            html += `
                <tr class="${rowClass}" style="cursor: pointer">
                    <td class="text-center">${posDisplay}</td>
                    <td>${u.name} ${isMe ? '(Você)' : ''}</td>
                    <td class="text-center"><span class="badge bg-light text-dark border">Lvl ${u.level || 1}</span></td>
                    <td class="text-end text-warning fw-bold">${u.experience || 0} XP</td>
                </tr>
            `;
            posicao++;
        });

        tbody.innerHTML = html;

    } catch (e) { console.error("Erro ranking:", e); tbody.innerHTML = '<tr><td colspan="4">Erro ao carregar.</td></tr>'; }
}

// 2. NOTIFICAÇÕES: Checar Sino (Bolinha Vermelha)
window.checkNotifications = async function() {
    if (!window.db || !window.auth.currentUser) return;
    
    try {
        // Busca notificações onde eu sou o alvo (ou minha turma, ou todos)
        // Nota: Firestore tem limites de 'OR' queries, então faremos uma busca ampla e filtraremos no cliente por simplicidade
        // Em produção, ideal seria duplicar notifs ou usar índices compostos avançados
        
        const q = window.query(window.collection(window.db, "notifications"), window.orderBy("createdAt", "desc"), window.limit(20));
        const snapshot = await window.getDocs(q);
        
        let unreadCount = 0;
        const myId = window.auth.currentUser.uid;
        const myClass = window.userData.classId;

        snapshot.forEach(doc => {
            const n = doc.data();
            
            // Verifica se é pra mim
            const isForMe = (n.targetId === 'all') || (n.targetId === myId) || (n.targetId === myClass);
            
            if (isForMe) {
                const readBy = n.readBy || [];
                if (!readBy.includes(myId)) {
                    unreadCount++;
                }
            }
        });

        // Atualiza a bolinha
        const badge = document.getElementById('notifBadge');
        if (badge) {
            badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
        }

    } catch (e) { console.error("Erro check notifs:", e); }
}

// 3. CARREGAR TELA DE NOTIFICAÇÕES (Lista e Detalhe)
window.loadNotificationsScreen = async function() {
    const listDiv = document.getElementById('notifList');
    if(!listDiv) return;

    try {
        const q = window.query(window.collection(window.db, "notifications"), window.orderBy("createdAt", "desc"), window.limit(15));
        const snapshot = await window.getDocs(q);
        
        const myId = window.auth.currentUser.uid;
        const myClass = window.userData.classId;
        let html = '';
        let hasItems = false;

        // Armazenar dados em memória para clicar e abrir
        window.currentNotifs = {}; 

        snapshot.forEach(doc => {
            const n = doc.data();
            const isForMe = (n.targetId === 'all') || (n.targetId === myId) || (n.targetId === myClass);
            
            if (isForMe) {
                hasItems = true;
                window.currentNotifs[doc.id] = n; // Salva para abrir depois
                
                const isUnread = !(n.readBy || []).includes(myId);
                const bgClass = isUnread ? 'bg-light border-start border-5 border-primary' : '';
                const icon = getIconByType(n.type);
                const date = new Date(n.createdAt).toLocaleDateString('pt-BR');

                html += `
                    <a href="#" class="list-group-item list-group-item-action ${bgClass} py-3" onclick="openNotification('${doc.id}')">
                        <div class="d-flex w-100 justify-content-between">
                            <small class="text-muted">${n.senderName}</small>
                            <small class="text-muted">${date}</small>
                        </div>
                        <div class="mb-1 fw-bold text-truncate">
                            ${icon} ${n.title}
                        </div>
                        <small class="${getUrgencyClass(n.urgency)}">${getUrgencyLabel(n.urgency)}</small>
                    </a>
                `;
            }
        });

        if (!hasItems) html = '<div class="text-center p-4">Nada por aqui.</div>';
        listDiv.innerHTML = html;

    } catch (e) { console.error("Erro lista notifs:", e); }
}

// 4. ABRIR NOTIFICAÇÃO (Marcar como lida)
window.openNotification = async function(docId) {
    const data = window.currentNotifs[docId];
    if (!data) return;

    // Renderizar Detalhe (Lado Direito)
    const detailDiv = document.getElementById('notifDetail');
    detailDiv.innerHTML = `
        <div class="border-bottom pb-3 mb-3">
            <h3 class="mb-2">${getIconByType(data.type)} ${data.title}</h3>
            <div class="text-muted small mb-3">
                Por <strong>${data.senderName}</strong> em ${new Date(data.createdAt).toLocaleString()}
                <span class="badge ${getUrgencyClass(data.urgency)} ms-2">${getUrgencyLabel(data.urgency)}</span>
            </div>
        </div>
        <div class="fs-5 text-dark" style="white-space: pre-wrap;">${data.content}</div>
    `;

    // Marcar como lida no Banco
    const myId = window.auth.currentUser.uid;
    if (!(data.readBy || []).includes(myId)) {
        await window.updateDoc(window.doc(window.db, "notifications", docId), {
            readBy: window.arrayUnion(myId)
        });
        // Atualiza a bolinha e a lista visualmente
        checkNotifications();
        loadNotificationsScreen();
    }
}

// Helpers Visuais
function getIconByType(type) {
    const icons = { 'homework': '📚', 'test': '📝', 'event': '🎉', 'dm': '💬' };
    return icons[type] || '📢';
}
function getUrgencyClass(u) {
    return u === 'urgent' ? 'text-danger fw-bold' : u === 'attention' ? 'text-warning fw-bold' : 'text-success';
}
function getUrgencyLabel(u) {
    return u === 'urgent' ? 'Urgente' : u === 'attention' ? 'Atenção' : 'Informativo';
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
window.cancelOrder = cancelOrder;
window.loadStudentsForAdmin = loadStudentsForAdmin;
window.createRule = createRule;
window.loadRules = loadRules;
window.applyRuleToStudent = applyRuleToStudent;
window.applyManualAdjustment = applyManualAdjustment;
window.loadTeacherClasses = loadTeacherClasses;
window.createNewClassPrompt = createNewClassPrompt;
window.sendNotification = sendNotification;
window.switchRanking = switchRanking;
window.checkNotifications = checkNotifications;
window.loadNotificationsScreen = loadNotificationsScreen;
window.openNotification = openNotification;
