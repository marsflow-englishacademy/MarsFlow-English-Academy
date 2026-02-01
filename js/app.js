// JavaScript principal do Hub Gamificado

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    console.log('App carregado.');
});

// Função chamada pelo index.html após login
window.initializeApp = function() {
    console.log('Inicializando dados reais...');
    loadRealRanking();
    loadRealActivities();
}

// Carregar Ranking Real do Firebase
async function loadRealRanking() {
    const topStudentsDiv = document.getElementById('topStudents');
    topStudentsDiv.innerHTML = '<div class="text-center"><div class="spinner-border text-primary spinner-border-sm"></div> Carregando...</div>';

    try {
        if (!window.db) {
            console.error('Banco de dados não disponível.');
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
            topStudentsDiv.innerHTML = '<div class="text-center text-muted">Sem dados ainda.</div>';
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

        topStudentsDiv.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
        topStudentsDiv.innerHTML = '<div class="text-center text-danger">Erro. Verifique o console.</div>';
    }
}

// Carregar Atividades (Simples baseada no perfil)
function loadRealActivities() {
    const activityList = document.getElementById('activityList');
    // Pega dados da tela pois userData é local do index.html
    const xp = parseInt(document.getElementById('userXP')?.innerText || '0');
    
    let html = '';
    if (xp > 0) {
        html += `
            <div class="d-flex align-items-center mb-3 p-2 bg-light rounded">
                <div class="me-3"><span style="font-size: 24px;">🎮</span></div>
                <div class="flex-grow-1">
                    <div class="fw-bold">Participação no Quiz</div>
                    <small class="text-muted">Recente</small>
                </div>
                <div class="text-end"><small class="text-success fw-bold">+XP</small></div>
            </div>`;
    } else {
        html = '<div class="text-center text-muted">Jogue para pontuar!</div>';
    }
    activityList.innerHTML = html;
}
