// JavaScript Principal - Mars Flow English Academy
// Versão: 3.1 (Brand Polish & High Contrast)

document.addEventListener('DOMContentLoaded', () => console.log('Mars Flow App Pronto.'));

window.initializeApp = function() {
    const role = window.userData.role;
    if (role === 'student') {
        loadRealRanking();
        loadTasks();
    }
    if (role === 'teacher' || role === 'admin') {
        if(window.loadTeacherDashboard) window.loadTeacherDashboard();
    }
    if(window.checkNotifications) window.checkNotifications();
}

// =================================================================
// 1. DASHBOARDS
// =================================================================

window.loadStudentDashboard = async function() {
    const u = window.userData;
    document.getElementById('homeStudentName').innerText = u.name.split(' ')[0];
    document.getElementById('homeStudentLevel').innerText = u.level || 1;
    document.getElementById('homeStudentXP').innerText = u.experience || 0;
    document.getElementById('homeStudentCoins').innerText = u.coins || 0;
    
    const avatarDiv = document.getElementById('homeStudentAvatar');
    if (u.photoURL) {
        avatarDiv.innerText = '';
        avatarDiv.style.backgroundImage = `url('${u.photoURL}')`;
    } else {
        avatarDiv.style.backgroundImage = '';
        avatarDiv.innerText = u.equippedIcon || '👤';
    }

    const xpInLevel = (u.experience || 0) % 100;
    document.getElementById('homeStudentXPBar').style.width = `${xpInLevel}%`;

    const topDiv = document.getElementById('homeTopStudents');
    if(topDiv && window.db) {
        try {
            const q = window.query(window.collection(window.db, "users"), window.orderBy("experience", "desc"), window.limit(5));
            const snap = await window.getDocs(q);
            let html = '';
            let pos = 1;
            snap.forEach(doc => {
                const s = doc.data();
                const icon = s.equippedIcon || '👤';
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center">
                        <span><strong class="text-mars-red me-2">#${pos}</strong> ${icon} ${s.name.split(' ')[0]}</span>
                        <span class="badge bg-light text-dark border fw-bold">${s.experience} XP</span>
                    </div>`;
                pos++;
            });
            topDiv.innerHTML = html;
        } catch(e) { console.error("Erro dashboard rank:", e); }
    }
    
    try {
        const qTasks = window.query(window.collection(window.db, "tasks"));
        const snapT = await window.getDocs(qTasks);
        document.getElementById('homeStudentTasks').innerText = snapT.size; 
    } catch(e){}
}

window.loadTeacherDashboard = async function() {
    try {
        const qOrders = window.query(window.collection(window.db, "orders"), window.where("status", "==", "pending_delivery"));
        const snapOrders = await window.getCountFromServer(qOrders);
        document.getElementById('dashTeacherOrders').innerText = snapOrders.data().count;

        const qSubs = window.query(window.collection(window.db, "submissions"), window.where("status", "==", "pending"));
        const snapSubs = await window.getCountFromServer(qSubs);
        document.getElementById('dashTeacherSubs').innerText = snapSubs.data().count;

        const qPhotos = window.query(window.collection(window.db, "users"), window.where("photoStatus", "==", "pending"));
        const snapPhotos = await window.getCountFromServer(qPhotos);
        document.getElementById('dashTeacherPhotos').innerText = snapPhotos.data().count;

    } catch (e) {
        document.getElementById('dashTeacherOrders').innerText = "-";
        document.getElementById('dashTeacherSubs').innerText = "-";
        document.getElementById('dashTeacherPhotos').innerText = "-";
    }
}

window.loadParentDashboard = async function() {
    if (window.userData.childrenIds && window.userData.childrenIds.length > 0) {
        const childId = window.userData.childrenIds[0];
        try {
            const childSnap = await window.getDoc(window.doc(window.db, "users", childId));
            if (childSnap.exists()) {
                const child = childSnap.data();
                document.getElementById('dashParentChildName').innerText = child.name;
                document.getElementById('dashParentChildLevel').innerText = child.level || 1;
                document.getElementById('dashParentChildXP').innerText = child.experience || 0;
                document.getElementById('dashParentChildCoins').innerText = child.coins || 0;
            }
        } catch(e) { console.error("Erro loading child:", e); }
    } else {
        document.getElementById('dashParentChildName').innerText = "Nenhum filho";
    }
}

window.loadDevStats = async function() {
    try {
        const qUsers = window.query(window.collection(window.db, "users"));
        const snapUsers = await window.getCountFromServer(qUsers);
        document.getElementById('devStatUsers').innerText = snapUsers.data().count;
    } catch(e) { document.getElementById('devStatUsers').innerText = "Err"; }
}

// =================================================================
// 2. NAVEGAÇÃO
// =================================================================

window.showAdminTab = function(tabName) {
    document.querySelectorAll('.admin-tab').forEach(el => el.style.display = 'none');
    document.getElementById(`adminTab-${tabName}`).style.display = 'block';
    if(event && event.currentTarget) {
        document.querySelectorAll('#adminSidebar button').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    if (tabName === 'store') { loadPendingOrders(); loadRedemptionHistory(); }
    if (tabName === 'classes') { loadTeacherClasses(); loadStudentsForAdmin(); loadPendingPhotos(); }
    if (tabName === 'comms') { loadInbox(); loadTeacherClasses(); }
}

window.showDevTab = function(tabName) {
    document.querySelectorAll('.dev-tab').forEach(el => el.style.display = 'none');
    document.getElementById(`devTab-${tabName}`).style.display = 'block';
    if(event && event.currentTarget) {
        document.querySelectorAll('#devSidebar button').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    if (tabName === 'users') loadDevDropdowns();
    if (tabName === 'store') loadStoreManagement();
}

// =================================================================
// 3. MENSAGENS
// =================================================================

window.sendMessage = async function() {
    const subject = document.getElementById('msgSubject').value;
    const content = document.getElementById('msgContent').value;
    if (!content) return alert("Escreva uma mensagem!");

    try {
        const user = window.userData;
        await window.addDoc(window.collection(window.db, "messages"), {
            senderId: window.auth.currentUser.uid,
            senderName: user.name,
            senderRole: user.role,
            subject: subject,
            content: content,
            status: 'unread',
            createdAt: new Date().toISOString()
        });
        alert("📨 Mensagem enviada!");
        document.getElementById('msgContent').value = '';
        loadMyMessages(); 
    } catch (e) { alert("Erro ao enviar."); }
}

window.loadMyMessages = async function() {
    const list = document.getElementById('myMessagesList');
    if(!list) return;
    try {
        const q = window.query(window.collection(window.db, "messages"), window.where("senderId", "==", window.auth.currentUser.uid), window.orderBy("createdAt", "desc"));
        const snap = await window.getDocs(q);
        if (snap.empty) { list.innerHTML = '<div class="text-center p-5 text-muted">Nenhuma mensagem.</div>'; return; }
        let html = '';
        snap.forEach(doc => {
            const m = doc.data();
            const date = new Date(m.createdAt).toLocaleDateString('pt-BR');
            let badge = '<span class="badge bg-secondary">Enviada</span>';
            if (m.status === 'replied') badge = '<span class="badge bg-success">Respondida</span>';
            html += `<div class="list-group-item p-3"><div class="d-flex justify-content-between mb-1"><strong class="text-mars-navy">${m.subject}</strong><small class="text-muted">${date}</small></div><p class="mb-2 small text-muted text-truncate">${m.content}</p><div class="d-flex justify-content-between align-items-center">${badge}</div></div>`;
        });
        list.innerHTML = html;
    } catch (e) { console.error("Erro msg:", e); }
}

window.loadInbox = async function() {
    const tbody = document.getElementById('inboxTableBody');
    if(!tbody) return;
    try {
        const q = window.query(window.collection(window.db, "messages"), window.orderBy("createdAt", "desc"), window.limit(50));
        const snap = await window.getDocs(q);
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Caixa de entrada vazia.</td></tr>'; return; }
        let html = '';
        snap.forEach(doc => {
            const m = doc.data();
            const date = new Date(m.createdAt).toLocaleDateString('pt-BR');
            const roleBadge = m.senderRole === 'parent' ? '<span class="badge bg-warning text-dark me-1">Pai</span>' : '<span class="badge bg-light text-dark border me-1">Aluno</span>';
            const btnReply = `<button class="btn btn-sm btn-outline-primary" onclick="replyToMessage('${doc.id}', '${m.senderId}', '${m.senderName}', '${m.subject}')"><i class="fas fa-reply"></i></button>`;
            const statusIcon = m.status === 'replied' ? '<i class="fas fa-check-double text-success"></i>' : '<i class="fas fa-envelope text-warning"></i>';
            html += `<tr><td><small>${date}</small></td><td>${roleBadge} <strong>${m.senderName}</strong></td><td>${statusIcon} ${m.subject}</td><td style="max-width: 250px;"><div class="text-truncate">${m.content}</div></td><td class="text-end">${btnReply}</td></tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { console.error("Erro inbox:", e); }
}

window.replyToMessage = function(msgId, studentId, studentName, subject) {
    showAdminTab('comms');
    document.getElementById('notifTitle').value = `RE: ${subject}`;
    document.getElementById('notifMessage').value = `Olá ${studentName}, sobre sua mensagem...`;
    document.getElementById('notifType').value = 'dm';
    document.getElementById('notifUrgency').value = 'chill';
    
    const targetSelect = document.getElementById('notifTarget');
    let optionExists = false;
    for (let i = 0; i < targetSelect.options.length; i++) {
        if (targetSelect.options[i].value === studentId) optionExists = true;
    }
    if (!optionExists) {
        const opt = document.createElement('option');
        opt.value = studentId; opt.text = `👤 ${studentName}`;
        targetSelect.add(opt);
    }
    targetSelect.value = studentId;
    window.updateDoc(window.doc(window.db, "messages", msgId), { status: 'replied' });
    alert(`Preencha a resposta e clique em Enviar.`);
}

// =================================================================
// 4. DEV
// =================================================================

window.createPreRegistry = async function() {
    const role = document.getElementById('devUserRole').value;
    const name = document.getElementById('devUserName').value;
    let login = document.getElementById('devUserEmail').value.trim().toLowerCase();
    
    if(!login || !name) return alert("Dados incompletos.");
    if (role === 'student' && !login.includes('@')) login += '@aluno.marsflow';

    const data = { name, email: login, role, createdAt: new Date().toISOString(), isPreRegistered: true };

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
        await window.setDoc(window.doc(window.db, "pre_registers", login), data);
        alert(`✅ Cadastro criado!\nLogin: ${login}`);
        document.getElementById('devUserName').value = '';
        document.getElementById('devUserEmail').value = '';
    } catch (e) { alert("Erro: " + e.message); }
}

window.loadDevDropdowns = async function() {
    const snapClasses = await window.getDocs(window.query(window.collection(window.db, "classes")));
    let opts = '<option value="">Selecione...</option>';
    let optsMulti = '';
    snapClasses.forEach(doc => {
        opts += `<option value="${doc.id}">${doc.data().name}</option>`;
        optsMulti += `<option value="${doc.id}">${doc.data().name}</option>`;
    });
    if(document.getElementById('devUserClass')) document.getElementById('devUserClass').innerHTML = opts;
    if(document.getElementById('devUserClasses')) document.getElementById('devUserClasses').innerHTML = optsMulti;
    if(document.getElementById('historyFilterClass')) document.getElementById('historyFilterClass').innerHTML = '<option value="all">Todas</option>' + optsMulti;

    const snapStudents = await window.getDocs(window.query(window.collection(window.db, "users"), window.where("role", "==", "student")));
    let stuOpts = '';
    snapStudents.forEach(doc => { stuOpts += `<option value="${doc.id}">${doc.data().name}</option>`; });
    if(document.getElementById('devUserChildren')) document.getElementById('devUserChildren').innerHTML = stuOpts;
}

window.toggleDevFields = function() {
    const role = document.getElementById('devUserRole').value;
    document.getElementById('devStudentFields').style.display = role === 'student' ? 'block' : 'none';
    document.getElementById('devTeacherFields').style.display = role === 'teacher' ? 'block' : 'none';
    document.getElementById('devParentFields').style.display = role === 'parent' ? 'block' : 'none';
}

window.loadStoreManagement = async function() {
    const tbody = document.getElementById('devStoreList');
    if(!tbody) return;
    try {
        const snap = await window.getDocs(window.query(window.collection(window.db, "shop_items"), window.orderBy("price", "asc")));
        if (snap.empty) { tbody.innerHTML = '<tr><td colspan="5">Vazia.</td></tr>'; return; }
        let html = '';
        snap.forEach(doc => {
            const i = doc.data();
            const itemStr = encodeURIComponent(JSON.stringify({...i, id: doc.id}));
            html += `<tr><td class="fs-4">${i.icon}</td><td class="text-start fw-bold">${i.name}</td><td class="text-success">${i.price}</td><td>${i.stock}</td>
            <td><button class="btn btn-sm btn-outline-primary" onclick="editStoreItem('${itemStr}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteStoreItem('${doc.id}', '${i.name}')"><i class="fas fa-trash"></i></button></td></tr>`;
        });
        tbody.innerHTML = html;
    } catch (e) { console.error(e); }
}

window.saveStoreItem = async function() {
    const id = document.getElementById('devItemId').value;
    const data = {
        icon: document.getElementById('devItemIcon').value,
        name: document.getElementById('devItemName').value,
        price: parseInt(document.getElementById('devItemPrice').value),
        description: document.getElementById('devItemDesc').value,
        type: document.getElementById('devItemType').value,
        category: document.getElementById('devItemCat').value,
        stock: parseInt(document.getElementById('devItemStock').value)
    };
    if (!data.name || !data.price) return alert("Preencha dados.");
    try {
        if (id) await window.updateDoc(window.doc(window.db, "shop_items", id), data);
        else await window.addDoc(window.collection(window.db, "shop_items"), data);
        alert("Salvo!");
        document.getElementById('devItemId').value = ''; 
        loadStoreManagement();
    } catch(e) { alert("Erro: " + e.message); }
}

window.editStoreItem = function(str) {
    const item = JSON.parse(decodeURIComponent(str));
    document.getElementById('devItemId').value = item.id;
    document.getElementById('devItemIcon').value = item.icon;
    document.getElementById('devItemName').value = item.name;
    document.getElementById('devItemPrice').value = item.price;
    document.getElementById('devItemDesc').value = item.description || '';
    document.getElementById('devItemType').value = item.type;
    document.getElementById('devItemCat').value = item.category || 'avatar';
    document.getElementById('devItemStock').value = item.stock;
    document.getElementById('devTab-store').scrollIntoView();
}

window.deleteStoreItem = async function(id, name) {
    if(!confirm(`Apagar "${name}"?`)) return;
    try { await window.deleteDoc(window.doc(window.db, "shop_items", id)); loadStoreManagement(); } catch(e) { alert("Erro ao deletar."); }
}

window.originalRole = null;
window.activateSimulation = function(targetRole) {
    if (!window.userData) return;
    const isDev = (window.auth.currentUser.email === 'fmartimr@gmail.com');
    if (!isDev) return alert("Apenas DEV.");

    if (!window.originalRole) window.originalRole = window.userData.role;

    if (targetRole === 'dev') {
        window.userData.role = window.originalRole;
        window.originalRole = null;
        document.getElementById('simulationBar').style.display = 'none';
        alert("Modo DEV restaurado.");
    } else {
        window.userData.role = targetRole;
        document.getElementById('simulationBar').style.display = 'block';
        document.getElementById('simRoleName').innerText = targetRole.toUpperCase();
    }
    updateUserInterface();
    showHome();
}

// =================================================================
// 5. CLIENTE
// =================================================================

window.currentRankingMode = 'general';
window.switchRanking = function(mode) {
    window.currentRankingMode = mode;
    document.getElementById('tabGeneral').className = mode === 'general' ? 'nav-link active fw-bold text-mars-navy border-bottom border-3 border-danger' : 'nav-link text-muted';
    document.getElementById('tabClass').className = mode === 'class' ? 'nav-link active fw-bold text-mars-navy border-bottom border-3 border-danger' : 'nav-link text-muted';
    loadRealRanking();
}

window.loadRealRanking = async function() {
    const tbody = document.getElementById('tabelaRankingCompleta');
    if(!tbody || !window.db) return;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4"><div class="spinner-border text-mars-navy"></div></td></tr>';

    try {
        let q = window.collection(window.db, "users");
        const badge = document.getElementById('myClassBadge');
        if(badge) badge.innerText = window.userData.classId ? "Turma Vinculada" : "Sem Turma";

        if (window.currentRankingMode === 'class') {
             if (!window.userData.classId) { tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Você não tem turma.</td></tr>'; return; }
             q = window.query(q, window.where("classId", "==", window.userData.classId), window.orderBy("experience", "desc"), window.limit(50));
        } else {
             q = window.query(q, window.orderBy("experience", "desc"), window.limit(50));
        }

        const snap = await window.getDocs(q);
        let html = ''; let pos = 1;
        snap.forEach(doc => {
            const u = doc.data();
            const isMe = (window.auth.currentUser.uid === doc.id);
            const rowClass = isMe ? 'table-warning fw-bold' : '';
            const medals = {1:'🥇', 2:'🥈', 3:'🥉'};
            html += `<tr class="${rowClass}"><td class="text-center">${medals[pos]||pos}</td><td>${u.equippedIcon||''} ${u.name}</td><td class="text-center">${u.level||1}</td><td class="text-end fw-bold text-mars-navy">${u.experience||0} XP</td></tr>`;
            pos++;
        });
        tbody.innerHTML = html || '<tr><td colspan="4">Sem dados.</td></tr>';
    } catch (e) { console.error(e); }
}

window.loadTasks = async function() {
    const list = document.getElementById('taskList');
    const countBadge = document.getElementById('taskCount');
    if (!list) return;
    try {
        const userId = window.auth.currentUser.uid;
        const tasksSnap = await window.getDocs(window.query(window.collection(window.db, "tasks"), window.orderBy("dueDate", "asc")));
        const subsSnap = await window.getDocs(window.query(window.collection(window.db, "submissions"), window.where("userId", "==", userId)));
        
        const mySubs = {};
        subsSnap.forEach(d => mySubs[d.data().taskId] = d.data().status);

        let html = ''; let pendentes = 0;
        tasksSnap.forEach((doc) => {
            const t = doc.data();
            const st = mySubs[doc.id];
            const date = t.dueDate ? new Date(t.dueDate).toLocaleDateString('pt-BR') : 'S/ Data';
            
            let action = `<button class="btn btn-danger btn-sm rounded-pill fw-bold" onclick="submitTask('${doc.id}', '${t.title}')">Entregar</button>`;
            let badge = '';

            if (st === 'approved') { badge = '<span class="badge bg-success ms-2">Feita</span>'; action = ''; }
            else if (st === 'pending') { badge = '<span class="badge bg-warning text-dark ms-2">Analisando</span>'; action = ''; }
            else { if (st === 'rejected') badge = '<span class="badge bg-danger ms-2">Refazer</span>'; pendentes++; }

            html += `
                <div class="list-group-item p-3 mb-2 shadow-sm rounded border-start border-4 border-danger">
                    <div class="d-flex justify-content-between align-items-center">
                        <div><h6 class="mb-1 text-mars-navy fw-bold">${t.title} ${badge}</h6><small class="text-muted">${t.description} • 📅 ${date}</small></div>
                        <div class="text-end"><div class="mb-2"><span class="badge bg-light text-dark border">+${t.xp} XP</span> <span class="badge bg-light text-dark border">+${t.coins} $</span></div>${action}</div>
                    </div>
                </div>`;
        });
        list.innerHTML = html || '<div class="p-4 text-center">Nenhuma missão.</div>';
        if(countBadge) countBadge.innerText = pendentes;
    } catch (e) { console.error(e); }
}

window.submitTask = async function(taskId, title) {
    const just = prompt("Cole o link ou escreva 'Feito':");
    if (!just) return;
    try {
        await window.setDoc(window.doc(window.db, "submissions", `${window.auth.currentUser.uid}_${taskId}`), {
            taskId, userId: window.auth.currentUser.uid, studentName: window.userData.name, taskTitle: title,
            justification: just, status: 'pending', submittedAt: new Date().toISOString()
        });
        alert("Enviado!"); loadTasks();
    } catch (e) { alert("Erro."); }
}

window.loadStore = async function() {
    const list = document.getElementById('storeList');
    if(document.getElementById('storeBalance')) document.getElementById('storeBalance').innerHTML = `${window.userData.coins || 0}`;

    try {
        const snap = await window.getDocs(window.query(window.collection(window.db, "shop_items"), window.orderBy("price", "asc")));
        if (snap.empty) { list.innerHTML = '<div class="col-12 text-center text-white">Loja vazia.</div>'; return; }

        const inventory = window.userData.inventory || [];
        let html = '';
        
        snap.forEach((doc) => {
            const item = doc.data();
            const already = inventory.includes(doc.id);
            const canBuy = (window.userData.coins >= item.price);
            const stock = item.stock || 0;
            
            let btn = '';
            if(stock <= 0) btn = `<button class="btn btn-secondary w-100" disabled>Esgotado</button>`;
            else if(already && item.type !== 'consumable') btn = `<button class="btn btn-secondary w-100" disabled>Comprado</button>`;
            else if(!canBuy) btn = `<button class="btn btn-outline-secondary w-100" disabled>Falta Moeda</button>`;
            else btn = `<button class="btn btn-danger w-100 fw-bold" onclick="buyItem('${doc.id}', '${item.name}', ${item.price})">COMPRAR</button>`;

            html += `
                <div class="col-md-4 mb-4">
                    <div class="card h-100 shadow-sm border-0 text-center p-3 hover-effect">
                        <div class="display-4 mb-2">${item.icon}</div>
                        <h5 class="fw-bold text-mars-navy">${item.name}</h5>
                        <h4 class="text-mars-red fw-bold my-3">${item.price} <small class="fs-6 text-muted">coins</small></h4>
                        ${btn}
                    </div>
                </div>`;
        });
        list.innerHTML = html;
    } catch(e) { console.error(e); }
}

window.buyItem = async function(id, name, price) {
    if(!confirm(`Comprar "${name}"?`)) return;
    try {
        const userRef = window.doc(window.db, "users", window.auth.currentUser.uid);
        const itemRef = window.doc(window.db, "shop_items", id);
        
        const uSnap = await window.getDoc(userRef);
        if(uSnap.data().coins < price) return alert("Saldo insuficiente.");

        await window.updateDoc(userRef, { coins: uSnap.data().coins - price, inventory: window.arrayUnion(id) });
        await window.addDoc(window.collection(window.db, "orders"), {
            userId: window.auth.currentUser.uid, studentName: window.userData.name, itemId: id, itemName: name,
            pricePaid: price, status: "pending_delivery", purchasedAt: new Date().toISOString()
        });
        
        const iSnap = await window.getDoc(itemRef);
        if(iSnap.exists()) await window.updateDoc(itemRef, { stock: (iSnap.data().stock || 99) - 1 });

        alert("Compra realizada!");
        window.userData.coins -= price; 
        loadStore(); updateUserInterface();
    } catch(e) { alert("Erro na compra."); }
}

window.loadProfile = async function() {
    const u = window.userData;
    document.getElementById('profileName').innerText = u.name;
    document.getElementById('profileLevel').innerText = u.level || 1;
    document.getElementById('xpRatio').innerText = `${(u.experience||0)%100} / 100 XP`;
    document.getElementById('xpBar').style.width = `${(u.experience||0)%100}%`;
    document.getElementById('profileBioDisplay').innerText = u.bio || "Sem bio definida.";
    
    const av = document.getElementById('profileAvatarDisplay');
    if(u.photoURL) { av.innerText = ''; av.style.backgroundImage = `url('${u.photoURL}')`; }
    else { av.style.backgroundImage = ''; av.innerText = u.equippedIcon || '👤'; }
    av.className = `display-1 bg-light rounded-circle border border-4 border-danger p-3 position-relative overflow-hidden ${u.equippedFrame||''}`;

    const badge = document.getElementById('photoStatusBadge');
    if(badge) badge.innerHTML = (u.photoStatus === 'pending') ? '<span class="badge bg-warning text-dark">Foto em Análise ⏳</span>' : '';

    loadInventory();
}

window.handlePhotoUpload = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 1048576) return alert("Imagem muito grande (Max 1MB).");
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64 = e.target.result;
            const role = window.userData.role;
            try {
                if (role === 'student') {
                    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), { tempPhoto: base64, photoStatus: 'pending' });
                    alert("Foto enviada para aprovação!");
                    window.userData.photoStatus = 'pending';
                } else {
                    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), { photoURL: base64 });
                    alert("Foto atualizada!");
                    window.userData.photoURL = base64;
                }
                loadProfile();
            } catch(e) { alert("Erro upload."); }
        }
        reader.readAsDataURL(file);
    }
}

window.editBio = function() { document.getElementById('bioEditContainer').style.display='block'; document.getElementById('bioInput').value = window.userData.bio || ''; }
window.saveBio = async function() {
    const txt = document.getElementById('bioInput').value;
    await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), { bio: txt });
    window.userData.bio = txt;
    document.getElementById('bioEditContainer').style.display='none';
    loadProfile();
}

window.loadInventory = async function() {
    const list = document.getElementById('inventoryList');
    try {
        const inv = window.userData.inventory || [];
        if(inv.length === 0) { list.innerHTML = '<div class="col-12 text-center p-4 text-muted">Mochila vazia.</div>'; return; }
        
        const snap = await window.getDocs(window.query(window.collection(window.db, "shop_items")));
        let html = '';
        snap.forEach(doc => {
            if(inv.includes(doc.id)) {
                const i = doc.data();
                const equipped = (window.userData.equippedIcon === i.icon);
                let btn = `<button class="btn btn-outline-primary btn-sm w-100" onclick="equipItem('${doc.id}', '${i.category||'avatar'}', '${i.icon}')">Equipar</button>`;
                if(equipped) btn = `<button class="btn btn-success btn-sm w-100" disabled>Equipado</button>`;
                if(i.type !== 'permanent') btn = `<button class="btn btn-secondary btn-sm" disabled>Consumível</button>`;
                html += `<div class="col-6 col-md-4"><div class="card h-100 text-center p-2"><div class="fs-1">${i.icon}</div><div class="small fw-bold text-mars-navy">${i.name}</div><div class="mt-auto pt-2">${btn}</div></div></div>`;
            }
        });
        list.innerHTML = html;
    } catch(e) { console.error(e); }
}

window.equipItem = async function(id, cat, val) {
    try {
        const up = {};
        if(cat === 'avatar') { up.equippedIcon = val; window.userData.equippedIcon = val; }
        await window.updateDoc(window.doc(window.db, "users", window.auth.currentUser.uid), up);
        alert("Equipado!"); loadProfile(); updateUserInterface();
    } catch(e) { alert("Erro."); }
}

window.createTask = async function() {
    const title = document.getElementById('taskTitle').value;
    const desc = document.getElementById('taskDesc').value;
    const xp = parseInt(document.getElementById('taskXP').value);
    const coins = parseInt(document.getElementById('taskCoins').value);
    const date = document.getElementById('taskDate').value;
    if(!title) return;
    try {
        await window.addDoc(window.collection(window.db, "tasks"), { title, description: desc, xp, coins, dueDate: date, createdAt: new Date().toISOString() });
        alert("Criada!");
    } catch(e) { alert("Erro."); }
}

window.loadPendingSubmissions = async function() {
    const list = document.getElementById('submissionsList');
    if(!list) return;
    try {
        const snap = await window.getDocs(window.query(window.collection(window.db, "submissions"), window.where("status", "==", "pending")));
        if(snap.empty) { list.innerHTML = '<div class="p-3 text-center text-muted">Nada pendente.</div>'; return; }
        let html = '';
        snap.forEach(doc => {
            const s = doc.data();
            html += `<div class="list-group-item"><h6 class="fw-bold text-mars-navy">${s.studentName}</h6><p class="mb-1 small">${s.taskTitle}</p><div class="bg-light p-2 mb-2 small text-muted">${s.justification}</div>
            <button class="btn btn-success btn-sm me-1" onclick="approveSubmission('${doc.id}', '${s.taskId}', '${s.userId}')">Aprovar</button>
            <button class="btn btn-danger btn-sm" onclick="rejectSubmission('${doc.id}')">Rejeitar</button></div>`;
        });
        list.innerHTML = html;
    } catch(e) { console.error(e); }
}

window.approveSubmission = async function(sid, tid, uid) {
    try {
        const tSnap = await window.getDoc(window.doc(window.db, "tasks", tid));
        const uRef = window.doc(window.db, "users", uid);
        const uSnap = await window.getDoc(uRef);
        
        const xp = tSnap.data().xp || 0;
        const coins = tSnap.data().coins || 0;
        
        await window.updateDoc(uRef, { experience: (uSnap.data().experience||0) + xp, coins: (uSnap.data().coins||0) + coins });
        await window.updateDoc(window.doc(window.db, "submissions", sid), { status: 'approved' });
        loadPendingSubmissions();
    } catch(e) { alert("Erro."); }
}

window.rejectSubmission = async function(sid) {
    if(!confirm("Rejeitar?")) return;
    await window.updateDoc(window.doc(window.db, "submissions", sid), { status: 'rejected' });
    loadPendingSubmissions();
}

window.loadPendingOrders = async function() {
    const list = document.getElementById('ordersList');
    try {
        const snap = await window.getDocs(window.query(window.collection(window.db, "orders"), window.where("status", "==", "pending_delivery")));
        if(snap.empty) { list.innerHTML = '<div class="p-3 text-center text-muted">Nada.</div>'; return; }
        let html = '';
        snap.forEach(doc => {
            const o = doc.data();
            html += `<div class="list-group-item d-flex justify-content-between align-items-center"><div><div class="fw-bold">${o.studentName}</div><div class="small">${o.itemName} (${o.pricePaid})</div></div>
            <button class="btn btn-success btn-sm" onclick="deliverOrder('${doc.id}')">Entregar</button></div>`;
        });
        list.innerHTML = html;
    } catch(e) {}
}

window.deliverOrder = async function(oid) {
    await window.updateDoc(window.doc(window.db, "orders", oid), { status: 'delivered', deliveredAt: new Date().toISOString() });
    loadPendingOrders();
}

window.loadPendingPhotos = async function() {
    const list = document.getElementById('pendingPhotosList');
    try {
        const snap = await window.getDocs(window.query(window.collection(window.db, "users"), window.where("photoStatus", "==", "pending")));
        if(snap.empty) { list.innerHTML = '<div class="p-3 text-center text-muted">Nada.</div>'; return; }
        let html = '';
        snap.forEach(doc => {
            const u = doc.data();
            html += `<div class="list-group-item text-center"><img src="${u.tempPhoto}" class="rounded-circle mb-2" width="50" height="50"><div class="fw-bold small">${u.name}</div>
            <button class="btn btn-success btn-sm py-0" onclick="decidePhoto('${doc.id}', true)">V</button> <button class="btn btn-danger btn-sm py-0" onclick="decidePhoto('${doc.id}', false)">X</button></div>`;
        });
        list.innerHTML = html;
    } catch(e) {}
}

window.decidePhoto = async function(uid, ok) {
    const ref = window.doc(window.db, "users", uid);
    const u = (await window.getDoc(ref)).data();
    if(ok) await window.updateDoc(ref, { photoURL: u.tempPhoto, tempPhoto: null, photoStatus: 'approved' });
    else await window.updateDoc(ref, { tempPhoto: null, photoStatus: 'rejected' });
    loadPendingPhotos();
}

window.loadRedemptionHistory = async function() {
    const tbody = document.getElementById('redemptionHistoryBody');
    try {
        const q = window.query(window.collection(window.db, "orders"), window.where("status", "==", "delivered"), window.orderBy("deliveredAt", "desc"), window.limit(50));
        const snap = await window.getDocs(q);
        let html = '';
        snap.forEach(doc => {
            const o = doc.data();
            html += `<tr><td>${new Date(o.deliveredAt).toLocaleDateString()}</td><td>${o.studentName}</td><td>${o.itemName}</td><td>${o.pricePaid}</td></tr>`;
        });
        tbody.innerHTML = html || '<tr><td colspan="4">Vazio.</td></tr>';
    } catch(e) {}
}

window.loadTeacherClasses = async function() {
    const list = document.getElementById('classList');
    const select = document.getElementById('notifTarget');
    try {
        const snap = await window.getDocs(window.query(window.collection(window.db, "classes")));
        let html = ''; let opts = '<option value="all">Todos</option>';
        snap.forEach(doc => {
            html += `<div class="list-group-item small"><strong>${doc.data().name}</strong></div>`;
            opts += `<option value="${doc.id}">${doc.data().name}</option>`;
        });
        list.innerHTML = html;
        if(select) select.innerHTML = opts;
    } catch(e){}
}

window.createNewClassPrompt = async function() {
    const name = prompt("Nome da Turma:");
    if(name) {
        await window.addDoc(window.collection(window.db, "classes"), { name, createdAt: new Date().toISOString() });
        loadTeacherClasses();
    }
}

window.sendNotification = async function() {
    const title = document.getElementById('notifTitle').value;
    const msg = document.getElementById('notifMessage').value;
    const target = document.getElementById('notifTarget').value;
    const type = document.getElementById('notifType').value;
    const urg = document.getElementById('notifUrgency').value;
    if(!title) return;
    try {
        await window.addDoc(window.collection(window.db, "notifications"), {
            title, content: msg, type, urgency: urg, targetId: target, 
            senderName: window.userData.name, createdAt: new Date().toISOString(), readBy: []
        });
        alert("Enviado!");
    } catch(e) { alert("Erro."); }
}

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
                const bgClass = isUnread ? 'bg-white border-start border-4 border-danger fw-bold' : '';
                const icon = {'homework':'📚', 'test':'📝', 'event':'🎉', 'dm':'💬'}[n.type] || '📢';
                html += `<a href="#" class="list-group-item list-group-item-action ${bgClass} py-3" onclick="openNotification('${doc.id}')"><div class="d-flex w-100 justify-content-between"><small class="text-muted">${n.senderName || 'Sistema'}</small><small class="text-muted">${new Date(n.createdAt).toLocaleDateString('pt-BR')}</small></div><div class="mb-1 text-truncate">${icon} ${n.title}</div></a>`;
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
    detailDiv.innerHTML = `<div class="text-start w-100"><h3 class="mb-2 text-mars-navy fw-bold">${icon} ${data.title}</h3><div class="text-muted small mb-4 pb-2 border-bottom">Por <strong>${data.senderName}</strong> em ${new Date(data.createdAt).toLocaleString()}<span class="badge bg-warning text-dark float-end">${data.urgency || 'Info'}</span></div><div class="fs-6 text-dark" style="white-space: pre-wrap; line-height: 1.6;">${data.content}</div></div>`;
    const myId = window.auth.currentUser.uid;
    if (!(data.readBy || []).includes(myId)) {
        await window.updateDoc(window.doc(window.db, "notifications", docId), { readBy: window.arrayUnion(myId) });
        checkNotifications();
        loadNotificationsScreen();
    }
}
