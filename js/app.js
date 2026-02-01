// JavaScript principal do Hub Gamificado
// Este arquivo contém as funções específicas do app

// Função para inicializar o app após login
function initializeApp() {
    console.log('Inicializando Hub Gamificado...');
    
    // Atualizar interface do usuário
    if (window.updateUserInterface) {
        window.updateUserInterface();
    }
    
    // Carregar dados iniciais
    loadInitialData();
    
    // Configurar event listeners
    setupEventListeners();
}

// Carregar dados iniciais do app
async function loadInitialData() {
    try {
        // Carregar ranking
        await loadRanking();
        
        // Carregar atividades recentes
        await loadRecentActivities();
        
        // Carregar próximas atividades
        await loadUpcomingActivities();
        
        console.log('Dados iniciais carregados com sucesso!');
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
    }
}

// Carregar ranking dos alunos
async function loadRanking() {
    try {
        // Simular dados de ranking (em produção, virão do Firebase)
        const mockRanking = [
            { name: 'Maria Silva', score: 1250, position: 1 },
            { name: 'João Santos', score: 1180, position: 2 },
            { name: 'Ana Costa', score: 1150, position: 3 },
            { name: 'Pedro Oliveira', score: 1100, position: 4 },
            { name: 'Lucia Ferreira', score: 1050, position: 5 }
        ];
        
        displayRanking(mockRanking);
    } catch (error) {
        console.error('Erro ao carregar ranking:', error);
    }
}

// Exibir ranking na interface
function displayRanking(ranking) {
    const topStudentsDiv = document.getElementById('topStudents');
    
    if (!ranking || ranking.length === 0) {
        topStudentsDiv.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                Ranking não disponível
            </div>
        `;
        return;
    }
    
    let html = '';
    ranking.forEach((student, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
        html += `
            <div class="d-flex justify-content-between align-items-center mb-2 p-2 border-bottom">
                <div>
                    <span class="me-2">${medal}</span>
                    <strong>${student.name}</strong>
                </div>
                <span class="badge bg-primary">${student.score} pts</span>
            </div>
        `;
    });
    
    topStudentsDiv.innerHTML = html;
}

// Carregar atividades recentes
async function loadRecentActivities() {
    try {
        // Simular atividades recentes
        const mockActivities = [
            { type: 'game', description: 'Completou o Quiz de Matemática', date: '2024-01-15', coins: 50 },
            { type: 'task', description: 'Entregou o trabalho de Ciências', date: '2024-01-14', xp: 100 },
            { type: 'level', description: 'Alcançou o nível 3!', date: '2024-01-13', xp: 0 }
        ];
        
        displayRecentActivities(mockActivities);
    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
    }
}

// Exibir atividades recentes
function displayRecentActivities(activities) {
    const activityList = document.getElementById('activityList');
    
    if (!activities || activities.length === 0) {
        activityList.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                Nenhuma atividade recente
            </div>
        `;
        return;
    }
    
    let html = '';
    activities.forEach(activity => {
        const icon = activity.type === 'game' ? '🎮' : activity.type === 'task' ? '📝' : '🏆';
        const reward = activity.coins ? `+${activity.coins} moedas` : activity.xp ? `+${activity.xp} XP` : '';
        
        html += `
            <div class="d-flex align-items-center mb-3 p-2 bg-light rounded">
                <div class="me-3">
                    <span style="font-size: 24px;">${icon}</span>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${activity.description}</div>
                    <small class="text-muted">${activity.date}</small>
                </div>
                <div class="text-end">
                    <small class="text-success fw-bold">${reward}</small>
                </div>
            </div>
        `;
    });
    
    activityList.innerHTML = html;
}

// Carregar próximas atividades
async function loadUpcomingActivities() {
    try {
        // Simular próximas atividades
        const mockUpcoming = [
            { title: 'Prova de Matemática', date: '2024-01-20', type: 'test' },
            { title: 'Entrega trabalho Ciências', date: '2024-01-22', type: 'assignment' },
            { title: 'Quiz de Português', date: '2024-01-25', type: 'quiz' }
        ];
        
        displayUpcomingActivities(mockUpcoming);
    } catch (error) {
        console.error('Erro ao carregar próximas atividades:', error);
    }
}

// Exibir próximas atividades
function displayUpcomingActivities(activities) {
    const upcomingDiv = document.getElementById('upcomingActivities');
    
    if (!activities || activities.length === 0) {
        upcomingDiv.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                Nenhuma atividade programada
            </div>
        `;
        return;
    }
    
    let html = '';
    activities.forEach(activity => {
        const icon = activity.type === 'test' ? '📝' : activity.type === 'assignment' ? '📄' : '❓';
        const daysUntil = Math.ceil((new Date(activity.date) - new Date()) / (1000 * 60 * 60 * 24));
        
        html += `
            <div class="d-flex align-items-center mb-2 p-2 border rounded">
                <div class="me-3">
                    <span style="font-size: 20px;">${icon}</span>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-bold">${activity.title}</div>
                    <small class="text-muted">${activity.date}</small>
                </div>
                <div class="text-end">
                    <small class="text-primary fw-bold">${daysUntil}d</small>
                </div>
            </div>
        `;
    });
    
    upcomingDiv.innerHTML = html;
}

// Configurar listeners de eventos
function setupEventListeners() {
    // Adicionar listeners para botões e elementos interativos
    console.log('Event listeners configurados');
}

// Funções para os jogos (serão implementadas depois)
window.playQuiz = function() {
    alert('Quiz em desenvolvimento! Em breve você poderá jogar.');
    
    // Simular jogo por enquanto
    setTimeout(() => {
        const pontuacao = Math.floor(Math.random() * 100) + 50;
        alert(`Parabéns! Você ganhou ${pontuacao} moedas!`);
        
        // Atualizar moedas do usuário
        if (userData) {
            userData.coins += pontuacao;
            if (window.updateUserInterface) {
                window.updateUserInterface();
            }
        }
    }, 1000);
};

// Sistema de notificações simples
function showNotification(message, type = 'info') {
    const notificationHtml = `
        <div class="alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3" role="alert" style="z-index: 9999;">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', notificationHtml);
    
    // Remover após 5 segundos
    setTimeout(() => {
        const notification = document.querySelector('.alert');
        if (notification) {
            notification.remove();
        }
    }, 5000);
}

// Exportar funções globais
window.initializeApp = initializeApp;
window.showNotification = showNotification;

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado. Aguardando autenticação...');
});