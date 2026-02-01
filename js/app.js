// JavaScript Principal - Hub Gamificado (Versão Admin + Tarefas)

// Inicialização
document.addEventListener('DOMContentLoaded', () => console.log('App pronto.'));

window.initializeApp = function() {
    loadRealRanking();
    loadRealActivities();
    loadTasks();
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
    // Espaço reservado para histórico futuro
    const list = document.getElementById('activityList');
    if(list) list.innerHTML = '<div class="text-center text-muted small">Suas conquistas aparecerão aqui.</div>';
}

// === 2. SISTEMA DE TAREFAS (ALUNO) ===
async function loadTasks() {
    const list = document.getElementById('taskList');
    if (!list || !window.db) return;

    try {
        const userId = window.auth.currentUser.uid;
        
        // Buscar todas as tarefas
        const tasksSnap = await window.getDocs(window.query(window.collection(window.db, "tasks"), window.orderBy("dueDate", "asc")));
        
        // Buscar entregas do aluno
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
                pendentes++;
                if (status === 'rejected') badge = '<span class="badge bg-danger ms-2">Refazer</span>';
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
    const just = prompt("Confirmação de entrega (Escreva 'Feito' ou cole um link):");
    if (!just) return;

    try {
        const uid = window.auth.currentUser.uid;
        const name = document.getElementById('userName')?.innerText || "Aluno";
        
        await window.setDoc(window.doc(window.db, "submissions", `${uid}_${taskId}`), {
            taskId, userId: uid, studentName: name, taskTitle: title,
            justification: just, status: 'pending', submittedAt: new Date().toISOString()
        });
        
        alert("Enviado para o professor!");
        loadTasks();
    } catch (e) { alert("Erro ao enviar."); }
}

// === 3. PAINEL DO PROFESSOR (ADMIN) ===

// A. Criar Nova Tarefa
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
        alert("Missão criada com sucesso!");
        document.getElementById('taskTitle').value = ''; // Limpar form
        loadTasks(); // Atualizar lista
    } catch (e) { alert("Erro ao criar missão: " + e.message); }
}

// B. Carregar Entregas Pendentes
window.loadPendingSubmissions = async function() {
    const list = document.getElementById('submissionsList');
    if(!list) return;

    try {
        // Buscar apenas status 'pending'
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

// C. Aprovar Entrega (Dar pontos!)
window.approveSubmission = async function(subId, taskId, userId) {
    if(!confirm("Aprovar e dar os pontos?")) return;

    try {
        // 1. Pegar dados da tarefa para saber quanto XP dar
        const taskDoc = await window.getDoc(window.doc(window.db, "tasks", taskId));
        const xpReward = taskDoc.data().xp || 0;
        const coinsReward = taskDoc.data().coins || 0;

        // 2. Atualizar o Aluno
        const userRef = window.doc(window.db, "users", userId);
        const userSnap = await window.getDoc(userRef);
        const userData = userSnap.data();

        const newXP = (userData.experience || 0) + xpReward;
        const newCoins = (userData.coins || 0) + coinsReward;
        const newLevel = Math.floor(newXP / 100) + 1;

        await window.updateDoc(userRef, {
            experience: newXP,
            coins: newCoins,
            level: newLevel
        });

        // 3. Marcar submissão como aprovada
        await window.updateDoc(window.doc(window.db, "submissions", subId), { status: 'approved' });

        alert(`Aprovado! Aluno ganhou ${xpReward} XP.`);
        loadPendingSubmissions(); // Recarregar lista

    } catch (e) { 
        console.error(e); 
        alert("Erro ao aprovar. Verifique o console."); 
    }
}

// D. Rejeitar Entrega
window.rejectSubmission = async function(subId) {
    if(!confirm("Rejeitar esta entrega? O aluno terá que refazer.")) return;
    try {
        await window.updateDoc(window.doc(window.db, "submissions", subId), { status: 'rejected' });
        loadPendingSubmissions();
    } catch (e) { alert("Erro ao rejeitar."); }
}

// Expor funções globais
window.loadTasks = loadTasks;
window.loadRealRanking = loadRealRanking;
window.createTask = createTask;
window.loadPendingSubmissions = loadPendingSubmissions;
window.approveSubmission = approveSubmission;
window.rejectSubmission = rejectSubmission;
