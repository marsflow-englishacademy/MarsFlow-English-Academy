// JavaScript principal do Hub Gamificado
// Gerencia Ranking Real e Atividades

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado. Aguardando autenticação...');
    // A inicialização real acontece quando o usuário loga (via index.html)
});

// Função chamada pelo index.html após login
window.initializeApp = function() {
    console.log('Inicializando dados reais...');
    loadRealRanking();
    loadRealActivities();
}

// Carregar Ranking Real do Firestore
async function loadRealRanking() {
    const topStudentsDiv = document.getElementById('topStudents');
    topStudentsDiv.innerHTML = '<div class="text-center"><div class="spinner-border text-primary spinner-border-sm"></div> Carregando...</div>';

    try {
        // Aguarda o db estar disponível
        if (!window.db) {
            console.log('Aguardando conexão com banco...');
            setTimeout(loadRealRanking, 1000);
            return;
        }

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
            topStudentsDiv.innerHTML = '<div class="text-center text-muted">Nenhum aluno pontuou ainda.</div>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const aluno = doc.data();
            const medal = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : `${posicao}º`;
            const nome = aluno.name || 'Aluno';
            // Se for o usuário atual, destaca
            const isCurrentUser = (window.auth.currentUser && window.auth.currentUser.uid === doc.id);
            const bgClass = isCurrentUser ? 'bg-primary text-white' : 'border-bottom';
            const badgeClass = isCurrentUser ? 'bg-light text-primary' : 'bg-primary';

            html += `
                <div class="d-flex justify-content-between align-items-center mb-2 p-2 ${bgClass} rounded">
                    <div>
                        <span class="me-2">${medal}</span>
                        <strong>${nome}</strong>
                    </div>
                    <span class="badge ${badgeClass}">${aluno.experience || 0} XP</span>
                </div>
            `;
            posicao++;
        });

        topStudentsDiv.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        topStudentsDiv.innerHTML = '<div class="text-center text-danger">Erro ao carregar ranking</div>';
    }
}

// Carregar Histórico de Atividades (Simulado por enquanto, pois ainda não salvamos histórico)
function loadRealActivities() {
    // Como ainda não criamos a coleção "activities", vamos mostrar as conquistas baseadas no perfil
    const activityList = document.getElementById('activityList');
    
    // Pegar dados do usuário atual da interface (já que userData pode estar protegido)
    const xp = parseInt(document.getElementById('userXP').innerText) || 0;
    const nivel = parseInt(document.getElementById('userLevel').innerText) || 1;

    let html = '';
    
    if (xp > 0) {
        html += createActivityItem('🎮', 'Jogou Quiz Educativo', 'Recentemente', `+XP acumulado`);
    }
    
    if (nivel > 1) {
        html += createActivityItem('🏆', `Alcançou o Nível ${nivel}!`, 'Conquista', '');
    }

    if (html === '') {
        html = '<div class="text-center text-muted"><i class="fas fa-info-circle me-2"></i>Jogue o Quiz para gerar atividades!</div>';
    }

    activityList.innerHTML = html;
}

function createActivityItem(icon, text, date, reward) {
    return `
        <div class="d-flex align-items-center mb-3 p-2 bg-light rounded">
            <div class="me-3"><span style="font-size: 24px;">${icon}</span></div>
            <div class="flex-grow-1">
                <div class="fw-bold">${text}</div>
                <small class="text-muted">${date}</small>
            </div>
            <div class="text-end"><small class="text-success fw-bold">${reward}</small></div>
        </div>
    `;
}

// Tornar global para acesso
window.loadRealRanking = loadRealRanking;
