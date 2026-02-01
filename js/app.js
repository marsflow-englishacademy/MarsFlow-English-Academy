// JavaScript principal do Hub Gamificado (Atualizado com Tarefas e Aprovação)

// Inicializar quando o DOM estiver pronto (apenas log)
document.addEventListener('DOMContentLoaded', function() {
    console.log('App carregado.');
});

// === 1. INICIALIZAÇÃO ===
// Esta função é chamada pelo index.html assim que o usuário faz login
window.initializeApp = function() {
    console.log('Inicializando dados reais...');
    loadRealRanking();
    loadRealActivities();
    loadTasks(); // Nova função de tarefas
}

// === 2. SISTEMA DE RANKING (DADOS REAIS) ===
async function loadRealRanking() {
    const topStudentsDiv = document.getElementById('topStudents');
    if(topStudentsDiv) topStudentsDiv.innerHTML = '<div class="text-center"><div class="spinner-border text-primary spinner-border-sm"></div> Carregando...</div>';

    try {
        if (!window.db) return;

        // Busca os 5 alunos com mais XP
        const q = window.query(
            window.collection(window.db, "users"), 
            window.orderBy("experience", "desc"), 
            window.limit(5)
        );
        
        const querySnapshot = await window.getDocs(q);
        let html = '';
        let posicao = 1;

        if (querySnapshot.empty) {
            if(topStudentsDiv) topStudentsDiv.innerHTML = '<div class="text-center text-muted">Sem dados ainda.</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const aluno = doc.data();
            const medal = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : `${posicao}º`;
            const nome = aluno.name || 'Aluno';
            const xp = aluno.experience || 0;
            
            // Destaca o usuário atual
            const isCurrentUser = (window.auth.currentUser && window.auth.currentUser.uid === doc.id);
            const bgClass = isCurrentUser ? 'bg-primary text-white' : 'border-bottom';
            const badgeClass = isCurrentUser ? 'bg-light text-primary' : 'bg-primary';

            html += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 ${bgClass} rounded">
                    <div>
                        <span class="me-2">${medal}</span>
                        <strong>${nome}</strong>
                    </div>
                    <span class="badge ${badgeClass}">${xp} XP</span>
                </div>
            `;
            posicao++;
        });

        if(topStudentsDiv) topStudentsDiv.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
    }
}

// === 3. SISTEMA DE ATIVIDADES RECENTES ===
function loadRealActivities() {
    const activityList = document.getElementById('activityList');
    if(!activityList) return;
    
    // Pega dados da tela pois userData é local do index.html
    const xp = parseInt(document.getElementById('userXP')?.innerText || '0');
    
    let html = '';
    // Mostra atividade fictícia se tiver XP (futuramente virá do banco)
    if (xp > 0) {
        html += `
            <div class="d-flex align-items-center mb-3 p-2 bg-light rounded">
                <div class="me-3"><span style="font-size: 24px;">🎮</span></div>
                <div class="flex-grow-1">
                    <div class="fw-bold">Atividade Recente</div>
                    <small class="text-muted">Você ganhou XP recentemente!</small>
                </div>
                <div class="text-end"><small class="text-success fw-bold">+XP</small></div>
            </div>`;
    } else {
        html = '<div class="text-center text-muted">Jogue ou faça tarefas para pontuar!</div>';
    }
    activityList.innerHTML = html;
}

// === 4. SISTEMA DE TAREFAS (COM APROVAÇÃO) ===
async function loadTasks() {
    const taskList = document.getElementById('taskList');
    
    if (!window.db || !window.auth.currentUser) return;
    if (!taskList) return; 

    try {
        const userId = window.auth.currentUser.uid;

        // A. Buscar todas as tarefas disponíveis
        const qTasks = window.query(
            window.collection(window.db, "tasks"), 
            window.orderBy("dueDate", "asc")
        );
        const snapshotTasks = await window.getDocs(qTasks);
        
        // B. Buscar o que o aluno já entregou
        const qSubmissions = window.query(
            window.collection(window.db, "submissions"),
            window.where("userId", "==", userId)
        );
        const snapshotSubmissions = await window.getDocs(qSubmissions);
        
        // Mapear status das entregas: { id_tarefa: 'pending' ou 'approved' }
        const userSubmissions = {};
        snapshotSubmissions.forEach(doc => {
            const data = doc.data();
            userSubmissions[data.taskId] = data.status;
        });

        let html = '';
        let pendingCount = 0;

        if (snapshotTasks.empty) {
            taskList.innerHTML = '<div class="p-4 text-center text-muted">Nenhuma tarefa ativa.</div>';
            return;
        }

        snapshotTasks.forEach((doc) => {
            const task = doc.data();
            const taskId = doc.id;
            const status = userSubmissions[taskId] || null;

            // Formatar data
            const dataEntrega = task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'Sem prazo';

            // Configurar botões e status visual
