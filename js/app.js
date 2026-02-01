// JavaScript Principal - Hub Gamificado (Versão Definitiva 2.0)
// Contém: Ranking, Tarefas, Loja, Perfil (Foto/Bio), Admin, Professor e Dev.

document.addEventListener('DOMContentLoaded', () => console.log('App pronto.'));

window.initializeApp = function() {
    loadRealRanking();
    loadTasks();
    if(window.checkNotifications) window.checkNotifications();
}

// =================================================================
// 1. RANKING & INTERFACE GERAL
// =================================================================

window.currentRankingMode = 'general';

window.switchRanking = function(mode) {
    window.currentRankingMode = mode;
    document.getElementById('tabGeneral').className = mode === 'general' ? 'nav-link active fw-bold' : 'nav-link text-dark';
    document.getElementById('tabClass').className = mode === 'class' ? 'nav-link active fw-bold' : 'nav-link text-dark';
    loadRealRanking();
}

window.loadRealRanking = async function() {
    const tbody = document.getElementById('tabelaRankingCompleta');
    if(!tbody || !window.db) return;
    
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        let q;
        const usersRef = window.collection(window.db, "users");

        // Atualiza badge da turma
        const classBadge = document.getElementById('myClassBadge');
        if(classBadge && window.userData) {
            classBadge.innerText = window.userData.classId ? "Turma Vinculada" : "Sem Turma";
        }

        if (window.currentRankingMode === 'class') {
            if (!window.userData || !window.userData.classId) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-muted">Você não está em nenhuma turma.</td></tr>';
                return;
            }
            q = window.query(usersRef, window.where("classId", "==", window.userData.classId), window.orderBy("experience", "desc"), window.limit(50));
        } else {
            q = window.query(usersRef, window.orderBy("experience", "desc"), window.limit(50));
        }

        const snapshot = await window.getDocs(q);
        let html = '';
        let posicao = 1;

        if(snapshot.empty) {
             tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Ninguém pontuou ainda.</td></tr>';
             return;
        }

        snapshot.forEach(doc => {
            const u = doc.data();
            const isMe = (window.auth.currentUser.uid === doc.id);
            const rowClass = isMe ? 'table-primary fw-bold' : '';
            
            let posDisplay = posicao;
            if (posicao === 1) posDisplay = '🥇';
            if (posicao === 2) posDisplay = '🥈';
            if (posicao === 3) posDisplay = '🥉';

            html += `
                <tr class="${rowClass}">
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

// =================================================================
// 2. TAREFAS (MISSÕES)
// =================================================================

window.loadTasks = async function() {
    const list = document.getElementById('taskList');
    if (!list || !window.db) return;

    try {
        const userId = window.auth.currentUser.uid;
        // Busca tarefas
        const tasksSnap = await window.getDocs(window.query(window.collection(window.db, "tasks"), window.orderBy("dueDate", "asc")));
        // Busca minhas entregas
        const subsSnap = await window.getDocs(window.query(window.collection(window.db, "submissions"), window.where("userId", "==", userId)));
        
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

// =================================================================
// 3. LOJA
// =================================================================

window.loadStore = async function() {
    const storeList = document.getElementById('storeList');
    const storeBalance = document.getElementById('storeBalance');
    
    if (window.userData && storeBalance) {
        storeBalance.innerHTML = `${window.userData.coins || 0} 💰`;
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
                btnHtml = `<button class="btn btn-success w-100" onclick="buyItem('${itemId}', '${item.name}', ${price})">Comprar por ${price}</button>`;
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
    if (!confirm(`Comprar "${itemName}" por ${currentPrice} moedas?`)) return;

    try {
        const userId = window.auth.currentUser.uid;
        const userName = window.userData?.name || "Aluno";
        const userRef = window.doc(window.db, "users", userId);
        const itemRef = window.doc(window.db, "shop_items", itemId);

        const itemSnap = await window.getDoc(itemRef);
        const itemData = itemSnap.data();
        
        if (itemData.stock !== undefined && itemData.stock <= 0) return alert("Esgotado!");
        
        const realPrice = Math.ceil(itemData.price);
        const userSnap = await window.getDoc(userRef);
        const userCoins = userSnap.data().coins || 0;

        if (userCoins < realPrice) return alert("Saldo insuficiente!");

        await window.updateDoc(userRef, {
            coins: userCoins - realPrice,
            inventory: window.arrayUnion(itemId)
        });

        await window.addDoc(window.collection(window.db, "orders"), {
            userId: userId, studentName: userName, itemId: itemId, itemName: itemName,
            pricePaid: realPrice, status: "pending_delivery", purchasedAt: new Date().toISOString()
        });

        const inflationRate = itemData.inflation || 0; 
        const newPrice = realPrice + (realPrice * inflationRate);
        const newStock = (itemData.stock !== undefined) ? itemData.stock - 1 : 99;

        await window.updateDoc(itemRef, { stock: newStock, price: newPrice });

        alert(`🎉 Compra realizada!`);
        
        // Atualiza localmente
        if (window.userData) {
            window.userData.coins = userCoins - realPrice;
            if(!window.userData.inventory) window.userData.inventory = [];
            window.userData.inventory.push(itemId);
        }
        loadStore();
        if(window.updateUserInterface) window.updateUserInterface();

    } catch (e) { alert("Erro na compra."); }
}

// =================================================================
// 4. PERFIL AVANÇADO (FOTO, BIO, INVENTÁRIO)
// =================================================================

window.loadProfile = async function() {
    // Referências HTML
    const avatarEl = document.getElementById('profileAvatarDisplay');
    const nameEl = document.getElementById('profileName');
    const classEl = document.getElementById('profileClass');
    const roleEl = document.getElementById('profileRole');
    const levelEl = document.getElementById('profileLevel');
    const xpBar = document.getElementById('xpBar');
    const xpRatio = document.getElementById('xpRatio');
    const xpToNext = document.getElementById('xpToNext');
    const bioDisplay = document.getElementById('profileBioDisplay');
    const badgeDiv = document.getElementById('photoStatusBadge');

    if(!window.userData || !window.db) return;

    // Dados Básicos
    nameEl.innerText = window.userData.name;
    roleEl.innerText = window.userData.role === 'student' ? 'Aluno' : window.userData.role.toUpperCase();
    levelEl.innerText = window.userData.level || 1;
    if(bioDisplay) bioDisplay.innerText = window.userData.bio || "Sem bio definida.";
    
    // Turma
    if(window.userData.classId) {
        try {
            const classSnap = await window.getDoc(window.doc(window.db, "classes", window.userData.classId));
            if(classSnap.exists()) classEl.innerText = classSnap.data().name;
        } catch(e) { classEl.innerText = "Turma não encontrada"; }
    } else {
        classEl.innerText = "Sem Turma Vinculada";
    }

    // Barra de XP
    const currentXP = window.userData.experience || 0;
    const level = window.userData.level || 1;
    const xpInThisLevel = currentXP % 100;
    const progressPercent = (xpInThisLevel / 100) * 100;

    xpBar.style.width = `${progressPercent}%`;
    xpRatio.innerText = `${xpInThisLevel} / 100 XP`;
    xpToNext.innerText = (100 - xpInThisLevel);

    // Avatar / Foto (Lógica: Foto Real > Emoji)
    const currentFrame = window.userData.equippedFrame || '';
    
    if (window.userData.photoURL) {
        avatarEl.innerText = '';
        avatarEl.style.backgroundImage = `url('${window.userData.photoURL}')`;
    } else {
        avatarEl.style.backgroundImage = '';
        avatarEl.innerText = window.userData.equippedIcon || '👤';
    }
    // Aplica moldura
    avatarEl.className = `display-1 bg-light rounded-circle border border-3 p-3 position-relative overflow-hidden ${currentFrame}`;

    // Badge de Foto Pendente
    if (badgeDiv) {
        if (window.userData.photoStatus === 'pending') {
            badgeDiv.innerHTML = '<span class="badge bg-warning text-dark">Foto em análise ⏳</span>';
        } else {
            badgeDiv.innerHTML = '';
        }
    }
    
    loadInventory();
}

// Upload de Foto
window.handlePhotoUpload = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 1048576) return alert("⚠️ A imagem é muito grande! Máximo de 1MB.");

        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Img = e.target.result;
            try {
                // Professores/Admins atualizam direto
                if (['teacher', 'admin', 'developer'].includes(window.userData.role)) {
                    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), { photoURL: base64Img });
                    window.userData.photoURL = base64Img; // Atualiza local
                    alert("Foto atualizada!");
                } else {
                    // Alunos precisam de aprovação
                    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), {
                        tempPhoto: base64Img,
                        photoStatus: 'pending'
                    });
                    window.userData.photoStatus = 'pending';
                    alert("📸 Foto enviada para aprovação!");
                }
                loadProfile();
            } catch (err) { alert("Erro ao salvar imagem."); }
        }
        reader.readAsDataURL(file);
    }
}

// Bio
window.editBio = function() {
    document.getElementById('bioEditContainer').style.display = 'block';
    document.getElementById('bioInput').value = window.userData.bio || '';
}

window.saveBio = async function() {
    const text = document.getElementById('bioInput').value;
    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), { bio: text });
    window.userData.bio = text;
    document.getElementById('bioEditContainer').style.display = 'none';
    loadProfile();
}

// Inventário
window.loadInventory = async function() {
    const listDiv = document.getElementById('inventoryList');
    if(!listDiv) return;

    try {
        const inventoryIds = window.userData.inventory || [];
        
        if (inventoryIds.length === 0) {
            listDiv.innerHTML = `<div class="col-12 text-center py-5"><p class="text-muted">Mochila vazia.</p><button class="btn btn-primary btn-sm" onclick="showStore()">Ir para Loja</button></div>`;
            return;
        }

        const q = window.query(window.collection(window.db, "shop_items"));
        const snapshot = await window.getDocs(q);
        let html = '';
        
        snapshot.forEach(doc => {
            if (inventoryIds.includes(doc.id)) {
                const item = doc.data();
                const isEquipped = (window.userData.equippedIcon === item.icon) || (window.userData.equippedFrame === item.code);
                
                let actionBtn = '';
                if (item.type === 'permanent') {
                    if (isEquipped) {
                        actionBtn = `<button class="btn btn-success btn-sm w-100" disabled><i class="fas fa-check"></i> Equipado</button>`;
                    } else {
                        const val = item.category === 'frame' ? (item.code || 'border-warning') : (item.icon || '😎');
                        const cat = item.category || 'avatar';
                        actionBtn = `<button class="btn btn-outline-primary btn-sm w-100" onclick="equipItem('${doc.id}', '${cat}', '${val}')">Equipar</button>`;
                    }
                } else {
                    actionBtn = `<button class="btn btn-secondary btn-sm w-100" disabled>Consumível</button>`;
                }

                html += `
                    <div class="col-6 col-md-4 col-lg-3">
                        <div class="card h-100 text-center p-2 ${isEquipped ? 'border-success shadow-sm' : ''}">
                            <div class="display-4 mb-2">${item.icon || '📦'}</div>
                            <h6 class="card-title text-truncate small">${item.name}</h6>
                            <div class="mt-auto">${actionBtn}</div>
                        </div>
                    </div>`;
            }
        });
        listDiv.innerHTML = html;
    } catch (e) { console.error("Erro inventário:", e); }
}

window.equipItem = async function(itemId, category, value) {
    try {
        const userId = window.auth.currentUser.uid;
        const updates = {};
        if (category === 'avatar') { updates.equippedIcon = value; window.userData.equippedIcon = value; }
        else if (category === 'frame') { updates.equippedFrame = value; window.userData.equippedFrame = value; }

        await window.updateDoc(window.doc(window.db, "users", userId), updates);
        alert("Equipado!");
        loadProfile();
        if(window.updateUserInterface) window.updateUserInterface();
    } catch (e) { alert("Erro ao equipar."); }
}

// =================================================================
// 5. NOTIFICAÇÕES (ALUNO)
// =================================================================

window.checkNotifications = async function() {
    if (!window.db || !window.auth.currentUser) return;
    try {
        const q = window.query(window.collection(window.db, "notifications"), window.orderBy("createdAt", "desc"), window.limit(20));
        const snapshot = await window.getDocs(q);
        
        let unreadCount = 0;
        const myId = window.auth.currentUser.uid;
        const myClass = window.userData ? window.userData.classId : null;

        snapshot.forEach(doc => {
            const n = doc.data();
            const isForMe = (n.targetId === 'all') || (n.targetId === myId) || (n.targetId === myClass);
            if (isForMe) {
                const readBy = n.readBy || [];
                if (!readBy.includes(myId)) unreadCount++;
            }
        });

        const badge = document.getElementById('notifBadge');
        if (badge) badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    } catch (e) { console.error("Erro check notifs:", e); }
}

window.loadNotificationsScreen = async function() {
    const listDiv = document.getElementById('notifList');
    if(!listDiv) return;

    try {
        const q = window.query(window.collection(window.db, "notifications"), window.orderBy("createdAt", "desc"), window.limit(15));
        const snapshot = await window.getDocs(q);
        
        const myId = window.auth.currentUser.uid;
        const myClass = window.userData ? window.userData.classId : null;
        let html = '';
        window.currentNotifs = {}; 

        snapshot.forEach(doc => {
            const n = doc.data();
            const isForMe = (n.targetId === 'all') || (n.targetId === myId) || (n.targetId === myClass);
            if (isForMe) {
                window.currentNotifs[doc.id] = n;
                const isUnread = !(n.readBy || []).includes(myId);
                const bgClass = isUnread ? 'bg-light border-start border-5 border-primary' : '';
                const icon = {'homework':'📚', 'test':'📝', 'event':'🎉', 'dm':'💬'}[n.type] || '📢';
                
                html += `
                    <a href="#" class="list-group-item list-group-item-action ${bgClass} py-3" onclick="openNotification('${doc.id}')">
                        <div class="d-flex w-100 justify-content-between">
                            <small class="text-muted">${n.senderName || 'Sistema'}</small>
                            <small class="text-muted">${new Date(n.createdAt).toLocaleDateString('pt-BR')}</small>
                        </div>
                        <div class="mb-1 fw-bold text-truncate">${icon} ${n.title}</div>
                    </a>`;
            }
        });
        listDiv.innerHTML = html || '<div class="text-center p-4">Nada por aqui.</div>';
    } catch (e) { console.error("Erro lista notifs:", e); }
}

window.openNotification = async function(docId) {
    const data = window.currentNotifs[docId];
    if (!data) return;

    const detailDiv = document.getElementById('notifDetail');
    const icon = {'homework':'📚', 'test':'📝', 'event':'🎉', 'dm':'💬'}[data.type] || '📢';
    
    detailDiv.innerHTML = `
        <div class="border-bottom pb-3 mb-3">
            <h3 class="mb-2">${icon} ${data.title}</h3>
            <div class="text-muted small mb-3">Por <strong>${data.senderName}</strong></div>
        </div>
        <div class="fs-5 text-dark" style="white-space: pre-wrap;">${data.content}</div>
    `;

    const myId = window.auth.currentUser.uid;
    if (!(data.readBy || []).includes(myId)) {
        await window.updateDoc(window.doc(window.db, "notifications", docId), { readBy: window.arrayUnion(myId) });
        checkNotifications();
        loadNotificationsScreen();
    }
}

// =================================================================
// 6. ADMIN & PROFESSOR
// =================================================================

// Criar Tarefa
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
        loadTasks(); 
    } catch (e) { alert("Erro: " + e.message); }
}

// Entregas e Correções
window.loadPendingSubmissions = async function() {
    const list = document.getElementById('submissionsList');
    if(!list) return;
    try {
        const q = window.query(window.collection(window.db, "submissions"), window.where("status", "==", "pending"));
        const snapshot = await window.getDocs(q);
        let html = '';
        if (snapshot.empty) html = '<div class="p-4 text-center text-muted">Nenhuma entrega.</div>';
        
        snapshot.forEach(doc => {
            const s = doc.data();
            html += `
                <div class="list-group-item p-3">
                    <h6 class="fw-bold">${s.studentName}</h6>
                    <p class="mb-1">Missão: ${s.taskTitle}</p>
                    <div class="alert alert-secondary p-2 mb-2 small">${s.justification}</div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-success btn-sm flex-grow-1" onclick="approveSubmission('${doc.id}', '${s.taskId}', '${s.userId}')">Aprovar</button>
                        <button class="btn btn-outline-danger btn-sm" onclick="rejectSubmission('${doc.id}')">Rejeitar</button>
                    </div>
                </div>`;
        });
        list.innerHTML = html;
    } catch (e) { console.error(e); }
}

window.approveSubmission = async function(subId, taskId, userId) {
    if(!confirm("Aprovar?")) return;
    try {
        const taskDoc = await window.getDoc(window.doc(window.db, "tasks", taskId));
        const userRef = window.doc(window.db, "users", userId);
        const userSnap = await window.getDoc(userRef);
        const u = userSnap.data();
        
        await window.updateDoc(userRef, { 
            experience: (u.experience||0) + taskDoc.data().xp, 
            coins: (u.coins||0) + taskDoc.data().coins,
            level: Math.floor(((u.experience||0) + taskDoc.data().xp)/100)+1
        });
        await window.updateDoc(window.doc(window.db, "submissions", subId), { status: 'approved' });
        alert("Aprovado!"); loadPendingSubmissions();
    } catch (e) { alert("Erro."); }
}

window.rejectSubmission = async function(subId) {
    if(!confirm("Rejeitar?")) return;
    try {
        await window.updateDoc(window.doc(window.db, "submissions", subId), { status: 'rejected' });
        loadPendingSubmissions();
    } catch (e) { alert("Erro."); }
}

// Pedidos da Loja (Admin)
window.loadPendingOrders = async function() {
    const list = document.getElementById('ordersList');
    if(!list) return;
    try {
        const q = window.query(window.collection(window.db, "orders"), window.where("status", "==", "pending_delivery"));
        const snapshot = await window.getDocs(q);
        let html = '';
        if (snapshot.empty) html = '<div class="p-4 text-center text-muted">Nenhum pedido pendente.</div>';
        
        snapshot.forEach(doc => {
            const o = doc.data();
            html += `
                <div class="list-group-item p-3 d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-bold">${o.studentName}</div>
                        <div class="small">Item: ${o.itemName} (${o.pricePaid}💰)</div>
                    </div>
                    <div>
                        <button class="btn btn-outline-danger btn-sm me-1" onclick="cancelOrder('${doc.id}', '${o.userId}', ${o.pricePaid}, '${o.itemName}', '${o.itemId}')">↩️</button>
                        <button class="btn btn-success btn-sm" onclick="deliverOrder('${doc.id}', '${o.itemName}')">✅</button>
                    </div>
                </div>`;
        });
        list.innerHTML = html;
    } catch (e) { console.error(e); }
}

window.deliverOrder = async function(orderId, itemName) {
    if(!confirm(`Confirmar entrega de "${itemName}"?`)) return;
    await window.updateDoc(window.doc(window.db, "orders", orderId), { status: 'delivered', deliveredAt: new Date().toISOString() });
    loadPendingOrders();
}

window.cancelOrder = async function(orderId, userId, price, itemName, itemId) {
    if(!confirm("Cancelar e devolver moedas?")) return;
    const userRef = window.doc(window.db, "users", userId);
    const u = (await window.getDoc(userRef)).data();
    await window.updateDoc(userRef, { coins: (u.coins||0) + price, inventory: window.arrayRemove(itemId) });
    await window.updateDoc(window.doc(window.db, "orders", orderId), { status: 'cancelled' });
    loadPendingOrders();
}

// Gestão de Alunos e Regras
window.loadStudentsForAdmin = async function() {
    const select = document.getElementById('studentSelect');
    if (!select) return;
    const q = window.query(window.collection(window.db, "users"), window.orderBy("name"));
    const snapshot = await window.getDocs(q);
    let html = '<option value="" selected disabled>Selecione...</option>';
    snapshot.forEach(doc => { html += `<option value="${doc.id}">${doc.data().name}</option>`; });
    select.innerHTML = html;
}

window.createRule = async function() {
    const name = document.getElementById('ruleName').value;
    const xp = parseInt(document.getElementById('ruleXP').value)||0;
    const coins = parseInt(document.getElementById('ruleCoins').value)||0;
    const type = document.getElementById('ruleType').value;
    await window.addDoc(window.collection(window.db, "rules"), { name, xp, coins, type, createdAt: new Date().toISOString() });
    alert("Regra criada!"); loadRules();
}

window.loadRules = async function() {
    const list = document.getElementById('rulesList');
    if (!list) return;
    const q = window.query(window.collection(window.db, "rules"), window.orderBy("createdAt", "desc"));
    const snapshot = await window.getDocs(q);
    let html = '';
    snapshot.forEach(doc => {
        const r = doc.data();
        const cls = r.type === 'positive' ? 'btn-outline-success' : 'btn-outline-danger';
        html += `<button class="btn ${cls} btn-sm mb-2" onclick="applyRuleToStudent('${r.name}', ${r.xp}, ${r.coins})">${r.name}</button> `;
    });
    list.innerHTML = html || 'Sem regras.';
}

window.applyRuleToStudent = async function(ruleName, xp, coins) {
    const studentId = document.getElementById('studentSelect').value;
    if (!studentId) return alert("Selecione um aluno!");
    if (!confirm(`Aplicar "${ruleName}"?`)) return;
    await updateUserStats(studentId, xp, coins);
}

window.applyManualAdjustment = async function() {
    const studentId = document.getElementById('studentSelect').value;
    const xp = parseInt(document.getElementById('manualXP').value)||0;
    const coins = parseInt(document.getElementById('manualCoins').value)||0;
    if (!studentId) return alert("Selecione um aluno!");
    await updateUserStats(studentId, xp, coins);
}

async function updateUserStats(userId, xpDelta, coinsDelta) {
    const userRef = window.doc(window.db, "users", userId);
    const u = (await window.getDoc(userRef)).data();
    await window.updateDoc(userRef, { 
        experience: (u.experience||0) + xpDelta, 
        coins: (u.coins||0) + coinsDelta 
    });
    alert("Aplicado!");
}

// Turmas e Notificações (Professor)
window.loadTeacherClasses = async function() {
    const listDiv = document.getElementById('classList');
    const selectTarget = document.getElementById('notifTarget');
    if (!listDiv) return;
    
    // Mostra todas para admin/dev, só as suas para professor
    let q = window.userData.role === 'teacher' 
        ? window.query(window.collection(window.db, "classes"), window.where("teacherId", "==", window.auth.currentUser.uid))
        : window.query(window.collection(window.db, "classes"));
        
    const snapshot = await window.getDocs(q);
    let htmlList = '';
    let htmlSelect = '<option value="all">Todas as Minhas Turmas</option>';
    
    if (snapshot.empty) htmlList = '<div class="p-3 text-center text-muted">Sem turmas.</div>';
    
    snapshot.forEach(doc => {
        const c = doc.data();
        htmlList += `<div class="list-group-item"><strong>${c.name}</strong> <span class="badge bg-primary">${(c.studentIds||[]).length} alunos</span></div>`;
        htmlSelect += `<option value="${doc.id}">${c.name}</option>`;
    });
    
    listDiv.innerHTML = htmlList;
    if(selectTarget) selectTarget.innerHTML = htmlSelect;
}

window.createNewClassPrompt = async function() {
    const name = prompt("Nome da Turma:");
    if(!name) return;
    const ref = await window.addDoc(window.collection(window.db, "classes"), {
        name, teacherId: window.auth.currentUser.uid, studentIds: [], createdAt: new Date().toISOString()
    });
    // Atualiza professor
    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), {
        myClasses: window.arrayUnion(ref.id)
    });
    alert("Turma Criada!"); loadTeacherClasses();
}

window.sendNotification = async function() {
    const title = document.getElementById('notifTitle').value;
    const msg = document.getElementById('notifMessage').value;
    const target = document.getElementById('notifTarget').value;
    const type = document.getElementById('notifType').value;
    const urgency = document.getElementById('notifUrgency').value;

    if (!title || !msg) return alert("Preencha tudo!");

    await window.addDoc(window.collection(window.db, "notifications"), {
        title, content: msg, type, urgency, targetId: target,
        senderId: window.auth.currentUser.uid, senderName: window.userData.name,
        readBy: [], createdAt: new Date().toISOString()
    });
    alert("Enviado!");
}

// Aprovação de Fotos
window.loadPendingPhotos = async function() {
    const list = document.getElementById('pendingPhotosList');
    if(!list) return;
    const q = window.query(window.collection(window.db, "users"), window.where("photoStatus", "==", "pending"));
    const snap = await window.getDocs(q);
    if(snap.empty) { list.innerHTML = '<div class="text-center p-3 text-muted small">Nenhuma foto pendente.</div>'; return; }
    
    let html = '';
    snap.forEach(doc => {
        const u = doc.data();
        html += `
            <div class="list-group-item text-center">
                <small class="fw-bold">${u.name}</small><br>
                <img src="${u.tempPhoto}" class="rounded-circle my-2 border" width="60" height="60" style="object-fit: cover;">
                <div class="d-flex gap-1 justify-content-center">
                    <button class="btn btn-success btn-sm py-0" onclick="decidePhoto('${doc.id}', true)">✅</button>
                    <button class="btn btn-danger btn-sm py-0" onclick="decidePhoto('${doc.id}', false)">❌</button>
                </div>
            </div>`;
    });
    list.innerHTML = html;
}

window.decidePhoto = async function(uid, approved) {
    const ref = window.doc(window.db, "users", uid);
    const u = (await window.getDoc(ref)).data();
    if(approved) await window.updateDoc(ref, { photoURL: u.tempPhoto, tempPhoto: null, photoStatus: 'approved' });
    else await window.updateDoc(ref, { tempPhoto: null, photoStatus: 'rejected' });
    loadPendingPhotos();
}

// Histórico de Resgates
window.loadRedemptionHistory = async function() {
    const tbody = document.getElementById('redemptionHistoryBody');
    if(!tbody) return;
    const q = window.query(window.collection(window.db, "orders"), window.where("status", "==", "delivered"), window.orderBy("deliveredAt", "desc"), window.limit(50));
    const snap = await window.getDocs(q);
    let html = '';
    snap.forEach(doc => {
        const o = doc.data();
        html += `<tr><td>${new Date(o.deliveredAt).toLocaleDateString()}</td><td class="text-start">${o.studentName}</td><td>${o.itemName}</td><td class="text-warning">${o.pricePaid}💰</td></tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="4">Vazio.</td></tr>';
}


// =================================================================
// 7. DESENVOLVEDOR (USER FACTORY)
// =================================================================

window.showDev = function() {
    if (window.auth.currentUser.email !== 'fmartimr@gmail.com') return alert("Acesso Negado.");
    hideAllSections();
    document.getElementById('devContent').style.display = 'block';
    loadDevDropdowns();
}

window.loadDevDropdowns = async function() {
    // Carregar Turmas
    const qClasses = window.query(window.collection(window.db, "classes"));
    const snapClasses = await window.getDocs(qClasses);
    let opts = '<option value="">Selecione...</option>';
    let optsMulti = '';
    snapClasses.forEach(doc => {
        const opt = `<option value="${doc.id}">${doc.data().name}</option>`;
        opts += opt; optsMulti += opt;
    });
    
    if(document.getElementById('devUserClass')) document.getElementById('devUserClass').innerHTML = opts;
    if(document.getElementById('devUserClasses')) document.getElementById('devUserClasses').innerHTML = optsMulti;
    if(document.getElementById('historyFilterClass')) document.getElementById('historyFilterClass').innerHTML = '<option value="all">Todas</option>' + optsMulti;

    // Carregar Alunos (para pais)
    const qStudents = window.query(window.collection(window.db, "users"), window.where("role", "==", "student"));
    const snapStudents = await window.getDocs(qStudents);
    let stuOpts = '';
    snapStudents.forEach(doc => { stuOpts += `<option value="${doc.id}">${doc.data().name} (${doc.data().email})</option>`; });
    if(document.getElementById('devUserChildren')) document.getElementById('devUserChildren').innerHTML = stuOpts;
}

window.toggleDevFields = function() {
    const role = document.getElementById('devUserRole').value;
    document.getElementById('devStudentFields').style.display = role === 'student' ? 'block' : 'none';
    document.getElementById('devTeacherFields').style.display = role === 'teacher' ? 'block' : 'none';
    document.getElementById('devParentFields').style.display = role === 'parent' ? 'block' : 'none';
}

window.createPreRegistry = async function() {
    const role = document.getElementById('devUserRole').value;
    const name = document.getElementById('devUserName').value;
    const email = document.getElementById('devUserEmail').value.trim().toLowerCase();
    
    if(!email || !name) return alert("Dados incompletos.");

    const data = { name, email, role, createdAt: new Date().toISOString(), isPreRegistered: true };

    if (role === 'student') {
        data.birthDate = document.getElementById('devUserDOB').value;
        data.classId = document.getElementById('devUserClass').value;
        data.level = 1; data.coins = 50; data.experience = 0;
    } else if (role === 'teacher') {
        data.myClasses = Array.from(document.getElementById('devUserClasses').selectedOptions).map(o => o.value);
    } else if (role === 'parent') {
        data.childrenIds = Array.from(document.getElementById('devUserChildren').selectedOptions).map(o => o.value);
    }

    try {
        await window.setDoc(window.doc(window.db, "pre_registers", email), data);
        alert(`✅ Pré-cadastro criado para ${email}!`);
    } catch (e) { alert("Erro: " + e.message); }
}

// Exportações Globais
window.loadTasks = loadTasks;
window.loadRealRanking = loadRealRanking;
window.createTask = createTask;
window.loadPendingSubmissions = loadPendingSubmissions;
window.approveSubmission = approveSubmission;
window.rejectSubmission = rejectSubmission;
window.loadStore = loadStore;
window.buyItem = buyItem;
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
window.loadProfile = loadProfile;
window.loadInventory = loadInventory;
window.equipItem = equipItem;
window.handlePhotoUpload = handlePhotoUpload;
window.editBio = editBio;
window.saveBio = saveBio;
window.showDev = showDev;
window.loadDevDropdowns = loadDevDropdowns;
window.toggleDevFields = toggleDevFields;
window.createPreRegistry = createPreRegistry;
window.loadPendingPhotos = loadPendingPhotos;
window.decidePhoto = decidePhoto;
window.loadRedemptionHistory = loadRedemptionHistory;
