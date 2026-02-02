// JavaScript Principal - MarsFlow English Academy
// Versão: 5.0 (Hub de Jogos, Filtros de Turma & Galaxy Defender)

document.addEventListener('DOMContentLoaded', () => console.log('MarsFlow App Pronto.'));

// Inicialização Global
window.initializeApp = function() {
    if (!window.userData) return;
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
// 9. JOGO GALAXY DEFENDER (ARCADE ENGINE)
// =================================================================

let shooterGameInstance = null;

window.startSpaceShooterGame = async function() {
    const btn = event.target; 
    const txt = btn.innerText; 
    btn.innerText = "Carregando..."; 
    btn.disabled = true;

    try {
        const userClass = window.userData.classId;
        let q = window.collection(window.db, "arcade_questions");
        
        // Filtro por turma
        if (window.userData.role === 'student') {
            if(!userClass) { alert("Você não tem turma vinculada!"); return; }
            q = window.query(q, window.where("targetClasses", "array-contains", userClass));
        }
        
        const snap = await window.getDocs(q);
        if (snap.empty) { 
            alert("Sem perguntas para sua turma."); 
            btn.innerText = txt; 
            btn.disabled = false; 
            return; 
        }

        const questions = [];
        snap.forEach(doc => {
            const data = doc.data();
            questions.push({ 
                q: data.question, 
                options: data.options, 
                correct: data.correct 
            });
        });

        // Alterna telas
        document.getElementById('gamesMenu').style.display = 'none';
        document.getElementById('gameUnscramble').style.display = 'none';
        document.getElementById('quizSelector').style.display = 'none';
        document.getElementById('gameSpaceShooter').style.display = 'block';
        document.getElementById('shooterGameOver').style.display = 'none';

        // Inicia Engine
        if (shooterGameInstance) shooterGameInstance.stop();
        shooterGameInstance = new SpaceShooterEngine('spaceCanvas');
        shooterGameInstance.loadQuestions(questions);
        shooterGameInstance.start();

    } catch(e) { 
        console.error(e); 
        alert("Erro ao carregar jogo. Verifique o console."); 
    } finally {
        btn.innerText = txt; 
        btn.disabled = false;
    }
}

window.stopSpaceShooter = function() { 
    if (shooterGameInstance) shooterGameInstance.stop(); 
}

class SpaceShooterEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        // Define tamanho
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.isRunning = false;
        this.score = 0;
        this.qIndex = 0;
        this.questions = [];
        this.player = { x: this.width/2, y: this.height-70, width: 60, height: 60, color: '#C8102E', speed: 8 };
        this.bullets = [];
        this.monsters = [];
        this.particles = [];
        this.keys = {};
        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
        window.addEventListener('keydown', e => { 
            if (e.code === 'Space' && this.isRunning) this.shoot(); 
        });
        
        let isTouch = false;
        this.canvas.addEventListener('touchstart', (e) => { 
            isTouch = true; 
            const touchX = e.touches[0].clientX - this.canvas.getBoundingClientRect().left; 
            this.player.x = touchX - this.player.width/2; 
            this.shoot(); 
        });
        this.canvas.addEventListener('touchmove', (e) => { 
            if(!isTouch) return; 
            const touchX = e.touches[0].clientX - this.canvas.getBoundingClientRect().left; 
            this.player.x = touchX - this.player.width/2; 
            e.preventDefault(); 
        });
        this.canvas.addEventListener('touchend', () => isTouch = false);
    }

    loadQuestions(qs) { 
        this.questions = [...qs].sort(() => Math.random() - 0.5); 
        this.qIndex = 0; 
        this.score = 0; 
        this.loadNextLevel(); 
    }

    loadNextLevel() {
        if (this.qIndex >= this.questions.length) { this.gameOver(); return; }
        
        this.bullets = [];
        this.monsters = [];
        const currentQ = this.questions[this.qIndex];
        
        document.getElementById('shooterQuestion').innerText = currentQ.q;
        document.getElementById('shooterScore').innerText = this.score;

        const options = [...currentQ.options].sort(() => Math.random() - 0.5);
        const sectionWidth = this.width / options.length;
        
        options.forEach((opt, i) => { 
            this.monsters.push({ 
                x: (sectionWidth * i) + (sectionWidth/2) - 40, 
                y: 50, 
                width: 100, height: 70, 
                text: opt, 
                isCorrect: (opt === currentQ.correct), 
                color: '#00205B', 
                dx: (Math.random() > 0.5 ? 1 : -1) * 1.5, 
                dy: 0.3 
            }); 
        });
    }

    start() { 
        if (this.isRunning) return; 
        this.isRunning = true; 
        this.gameLoop(); 
    }
    
    stop() { this.isRunning = false; }

    gameOver() {
        this.stop();
        document.getElementById('shooterGameOver').style.display = 'flex';
        document.getElementById('shooterFinalScore').innerText = this.score;
        
        if(window.userData && this.score > 0) {
            const xpGain = this.score * 2;
            const userRef = window.doc(window.db, "users", window.auth.currentUser.uid);
            window.updateDoc(userRef, { experience: window.increment(xpGain) });
        }
    }

    shoot() { 
        this.bullets.push({ 
            x: this.player.x + this.player.width/2 - 5, 
            y: this.player.y, 
            width: 10, height: 20, 
            color: '#FFD700', speed: 12 
        }); 
    }

    gameLoop() { 
        if (!this.isRunning) return; 
        this.update(); 
        this.draw(); 
        requestAnimationFrame(() => this.gameLoop()); 
    }

    update() {
        // Player
        if ((this.keys['ArrowLeft'] || this.keys['KeyA']) && this.player.x > 0) this.player.x -= this.player.speed;
        if ((this.keys['ArrowRight'] || this.keys['KeyD']) && this.player.x + this.player.width < this.width) this.player.x += this.player.speed;

        // Bullets
        this.bullets.forEach(b => b.y -= b.speed);
        this.bullets = this.bullets.filter(b => b.y + b.height > 0);

        // Monsters
        this.monsters.forEach(m => { 
            m.x += m.dx; 
            m.y += m.dy; 
            if (m.x < 0 || m.x + m.width > this.width) m.dx *= -1; 
        });

        // Particles
        this.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        this.particles = this.particles.filter(p => p.life > 0);

        this.checkCollisions();
    }

    checkCollisions() {
        this.bullets.forEach((b, bIdx) => {
            this.monsters.forEach((m, mIdx) => {
                if (b.x < m.x + m.width && b.x + b.width > m.x && b.y < m.y + m.height && b.y + b.height > m.y) {
                    this.bullets.splice(bIdx, 1);
                    
                    if (m.isCorrect) {
                        this.score += 20; 
                        this.createExplosion(m.x + m.width/2, m.y + m.height/2, '#28a745'); 
                        this.monsters.splice(mIdx, 1);
                        setTimeout(() => { this.qIndex++; this.loadNextLevel(); }, 800);
                    } else {
                        this.score = Math.max(0, this.score - 10); 
                        document.getElementById('shooterScore').innerText = this.score;
                        m.color = '#C8102E'; 
                        this.createExplosion(m.x + m.width/2, m.y + m.height/2, '#C8102E'); 
                        setTimeout(() => m.color = '#00205B', 500);
                    }
                }
            });
        });
    }

    createExplosion(x, y, color) { 
        for (let i = 0; i < 20; i++) { 
            this.particles.push({ 
                x: x, y: y, 
                vx: (Math.random() - 0.5) * 12, 
                vy: (Math.random() - 0.5) * 12, 
                size: Math.random() * 6 + 2, 
                color: color, 
                life: 40 
            }); 
        } 
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Player
        const p = this.player; 
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath(); 
        this.ctx.moveTo(p.x + p.width/2, p.y); 
        this.ctx.lineTo(p.x + p.width, p.y + p.height); 
        this.ctx.lineTo(p.x, p.y + p.height); 
        this.ctx.fill();
        this.ctx.fillStyle = '#00205B'; 
        this.ctx.fillRect(p.x + 10, p.y + p.height - 10, p.width - 20, 10);

        // Bullets
        this.bullets.forEach(b => { 
            this.ctx.fillStyle = b.color; 
            this.ctx.beginPath(); 
            this.ctx.roundRect(b.x, b.y, b.width, b.height, 5); 
            this.ctx.fill(); 
        });

        // Monsters
        this.monsters.forEach(m => { 
            this.ctx.fillStyle = m.color; 
            this.ctx.beginPath(); 
            this.ctx.roundRect(m.x, m.y, m.width, m.height, 15); 
            this.ctx.fill(); 
            
            this.ctx.fillStyle = '#fff'; 
            this.ctx.beginPath(); 
            this.ctx.arc(m.x + 30, m.y + 25, 8, 0, Math.PI*2); 
            this.ctx.fill(); 
            this.ctx.beginPath(); 
            this.ctx.arc(m.x + m.width - 30, m.y + 25, 8, 0, Math.PI*2); 
            this.ctx.fill(); 
            
            this.ctx.font = 'bold 16px Poppins'; 
            this.ctx.textAlign = 'center'; 
            this.ctx.fillText(m.text, m.x + m.width/2, m.y + m.height/2 + 15); 
        });

        // Particles
        this.particles.forEach(pt => { 
            this.ctx.fillStyle = pt.color; 
            this.ctx.globalAlpha = pt.life / 40; 
            this.ctx.beginPath(); 
            this.ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI*2); 
            this.ctx.fill(); 
        });
        this.ctx.globalAlpha = 1;
    }
}

// =================================================================
// GESTÃO DE JOGOS & FILTRO DE TURMAS
// =================================================================

window.renderClassSelector = async function(containerId, selectedIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '<div class="spinner-border spinner-border-sm text-mars-navy"></div>';
    
    try {
        const snap = await window.getDocs(window.query(window.collection(window.db, "classes"), window.orderBy("name")));
        let html = '';
        
        snap.forEach(doc => {
            const isChecked = selectedIds.includes(doc.id) ? 'checked' : '';
            html += `
                <div class="form-check form-check-inline">
                    <input class="form-check-input class-checkbox" type="checkbox" value="${doc.id}" id="${containerId}_${doc.id}" ${isChecked}>
                    <label class="form-check-label" for="${containerId}_${doc.id}">${doc.data().name}</label>
                </div>
            `;
        });
        
        container.innerHTML = html || '<span class="text-muted small">Crie turmas primeiro.</span>';
    } catch(e) { console.error(e); }
}

window.getSelectedClasses = function(containerId) {
    return Array.from(document.querySelectorAll(`#${containerId} .class-checkbox:checked`)).map(cb => cb.value);
}

// --- GESTÃO DE ARCADE ---
window.loadArcadeLibrary = async function() {
    const list = document.getElementById('arcadeLibraryList');
    const snap = await window.getDocs(window.query(window.collection(window.db, "arcade_questions"), window.orderBy("unit")));
    let html = '';
    
    if (snap.empty) { list.innerHTML = '<div class="p-3 text-muted">Vazio.</div>'; return; }

    snap.forEach(doc => {
        const q = doc.data(); 
        const str = encodeURIComponent(JSON.stringify({...q, id: doc.id})); 
        const cc = q.targetClasses ? q.targetClasses.length : 0;
        
        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="badge bg-secondary">U${q.unit}</span> 
                    <span class="fw-bold text-mars-navy">${q.question}</span>
                    <br><small class="text-muted">Resp: ${q.correct} | Turmas: ${cc}</small>
                </div>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editArcade('${str}')"><i class="fas fa-pen"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteArcade('${doc.id}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
    });
    list.innerHTML = html;
}

window.saveArcadeQuestion = async function() {
    const id = document.getElementById('arcadeId').value;
    const targetClasses = getSelectedClasses('arcadeClassSelector');
    
    if (targetClasses.length === 0) return alert("Selecione a turma!");

    const data = {
        unit: parseInt(document.getElementById('arcadeUnit').value), 
        lesson: parseInt(document.getElementById('arcadeLesson').value),
        question: document.getElementById('arcadeQuestion').value, 
        correct: document.getElementById('arcadeCorrect').value,
        options: [
            document.getElementById('arcadeCorrect').value, 
            document.getElementById('arcadeWrong1').value, 
            document.getElementById('arcadeWrong2').value
        ],
        targetClasses: targetClasses, 
        updatedAt: new Date().toISOString()
    };

    try {
        if(id) await window.updateDoc(window.doc(window.db, "arcade_questions", id), data);
        else await window.addDoc(window.collection(window.db, "arcade_questions"), data);
        alert("Salvo!"); resetArcadeForm(); loadArcadeLibrary();
    } catch(e) { alert("Erro: " + e.message); }
}

window.editArcade = function(str) {
    const q = JSON.parse(decodeURIComponent(str));
    document.getElementById('arcadeId').value = q.id; 
    document.getElementById('arcadeUnit').value = q.unit; 
    document.getElementById('arcadeLesson').value = q.lesson;
    document.getElementById('arcadeQuestion').value = q.question; 
    document.getElementById('arcadeCorrect').value = q.correct;
    
    const wrongs = q.options.filter(o => o !== q.correct);
    document.getElementById('arcadeWrong1').value = wrongs[0] || ''; 
    document.getElementById('arcadeWrong2').value = wrongs[1] || '';
    
    renderClassSelector('arcadeClassSelector', q.targetClasses || []);
}

window.deleteArcade = async function(id) { 
    if(confirm("Apagar?")) { 
        await window.deleteDoc(window.doc(window.db, "arcade_questions", id)); 
        loadArcadeLibrary(); 
    } 
}

window.resetArcadeForm = function() { 
    document.querySelector('#adminTab-arcade form').reset(); 
    document.getElementById('arcadeId').value = ''; 
    renderClassSelector('arcadeClassSelector'); 
}

// =================================================================
// OUTROS MÓDULOS (QUIZ, UNSCRAMBLE, ATTENDANCE)
// =================================================================

// UNSCRAMBLE
window.unscrambleLevels=[]; window.currentUnscrambleIndex=0; window.userAnswerWords=[]; window.poolWords=[];

window.startUnscrambleGame = async function() {
    const btn = event.target; 
    const txt = btn.innerText; 
    btn.innerText="Carregando..."; 
    btn.disabled=true;
    
    try { 
        const userClass = window.userData.classId;
        let q = window.collection(window.db, "unscramble_activities");
        
        if (window.userData.role === 'student') {
            if(!userClass) { alert("Sem turma vinculada."); return; }
            q = window.query(q, window.where("targetClasses", "array-contains", userClass), window.orderBy("unit"));
        } else {
            q = window.query(q, window.orderBy("unit"));
        }
        
        const snap = await window.getDocs(q);
        if(snap.empty){ alert("Sem frases disponíveis."); btn.innerText=txt; btn.disabled=false; return; }
        
        window.unscrambleLevels=[]; 
        snap.forEach(d=>window.unscrambleLevels.push(d.data()));
        
        document.getElementById('gamesMenu').style.display='none'; 
        document.getElementById('gameUnscramble').style.display='block'; 
        window.currentUnscrambleIndex=0; 
        loadUnscrambleLevel(0);
        
    } catch(e){ console.error(e); alert("Erro ao carregar."); } 
    btn.innerText=txt; 
    btn.disabled=false;
}

window.loadUnscrambleLevel = function(i) {
    const d=window.unscrambleLevels[i]; 
    document.getElementById('unscrambleLevelBadge').innerText=`${i+1}/${window.unscrambleLevels.length}`; 
    document.getElementById('unscrambleTranslation').innerText=d.translation; 
    document.getElementById('unscrambleSuccessMsg').style.display='none';
    
    const w=d.sentence.trim().split(/\s+/); 
    window.poolWords=[...w].sort(()=>Math.random()-0.5); 
    window.userAnswerWords=[]; 
    renderUnscrambleUI();
}

window.renderUnscrambleUI = function() {
    const p=document.getElementById('unscramblePoolArea'); 
    const a=document.getElementById('unscrambleAnswerArea'); 
    p.innerHTML=''; a.innerHTML='';
    
    if(window.userAnswerWords.length===0) a.innerHTML='<small class="text-muted">Monte a frase</small>';
    
    window.userAnswerWords.forEach((w,i)=>a.appendChild(createWordButton(w,i,'answer'))); 
    window.poolWords.forEach((w,i)=>p.appendChild(createWordButton(w,i,'pool'))); 
    checkUnscramble();
}

function createWordButton(w,i,l){ 
    const b=document.createElement('button'); 
    b.className='word-btn m-1'; b.innerText=w; 
    b.onclick=()=>{ 
        if(l==='pool'){ window.userAnswerWords.push(w); window.poolWords.splice(i,1); }
        else{ window.poolWords.push(w); window.userAnswerWords.splice(i,1); } 
        renderUnscrambleUI(); 
    }; 
    return b; 
}

window.checkUnscramble=function(){
    const correct=window.unscrambleLevels[window.currentUnscrambleIndex].sentence.trim().split(/\s+/); 
    let allOk=true;
    
    document.querySelectorAll('#unscrambleAnswerArea button').forEach((b,i)=>{ 
        if(allOk && window.userAnswerWords[i]===correct[i]){ b.classList.add('correct-pos'); }
        else{ allOk=false; b.classList.remove('correct-pos'); } 
    });
    
    if(window.userAnswerWords.length===correct.length && allOk) { 
        document.getElementById('unscrambleSuccessMsg').style.display='block'; 
        if(window.userData){ window.updateDoc(window.doc(window.db,"users",window.auth.currentUser.uid),{experience:window.increment(10)}); } 
    }
}

window.nextUnscrambleLevel=function(){ 
    window.currentUnscrambleIndex++; 
    if(window.currentUnscrambleIndex<window.unscrambleLevels.length) loadUnscrambleLevel(window.currentUnscrambleIndex); 
    else { alert("Fim!"); backToGamesMenu(); } 
}

window.backToGamesMenu=function(){ 
    document.getElementById('gamesMenu').style.display='block'; 
    document.getElementById('gameUnscramble').style.display='none'; 
    document.getElementById('quizSelector').style.display='none'; 
    document.getElementById('gameSpaceShooter').style.display='none'; 
    stopSpaceShooter(); 
}

// QUIZ
window.showQuizSelector=async function(){ 
    document.getElementById('gamesMenu').style.display='none'; 
    document.getElementById('quizSelector').style.display='block'; 
    const c=document.getElementById('quizListContainer'); 
    c.innerHTML='Loading...';
    
    let q = window.collection(window.db,"quizzes");
    if (window.userData.role === 'student') { 
        if(!window.userData.classId) return alert("Sem turma.");
        q = window.query(q, window.where("targetClasses", "array-contains", window.userData.classId), window.orderBy("unit")); 
    } else { q = window.query(q, window.orderBy("unit")); }
    
    try { 
        const s=await window.getDocs(q);
        let h=''; 
        s.forEach(d=>{ 
            const z=d.data(); 
            const str=encodeURIComponent(JSON.stringify({...z,id:d.id})); 
            h+=`<div class="col-md-6 mb-3"><div class="card h-100 p-3 hover-effect" onclick="startQuiz('${str}')"><h5 class="text-mars-navy">Unit ${z.unit}</h5><p>${z.title}</p></div></div>`; 
        }); 
        c.innerHTML=h||'Nenhum quiz disponível.';
    } catch(e) { console.error(e); c.innerHTML = "Erro ao carregar."; }
}

window.activeQuiz=null; window.quizScore=0; window.qIdx=0;

window.startQuiz=function(str){ 
    window.activeQuiz=JSON.parse(decodeURIComponent(str)); 
    window.qIdx=0; window.quizScore=0; 
    document.getElementById('quizSelector').style.display='none'; 
    document.getElementById('quizPlayer').style.display='block'; 
    document.getElementById('quizQuestionArea').style.display='block'; 
    document.getElementById('quizResultArea').style.display='none'; 
    renderQuizQ(); 
}

window.renderQuizQ=function(){ 
    const q=window.activeQuiz.questions[window.qIdx]; 
    document.getElementById('qText').innerText=q.text; 
    let h=''; 
    q.options.forEach((o,i)=>h+=`<button class="btn btn-outline-primary p-3 text-start" onclick="checkQ(${i},this)">${o}</button>`); 
    document.getElementById('qOptions').innerHTML=h; 
    document.getElementById('quizProgressBar').style.width=`${(window.qIdx/window.activeQuiz.questions.length)*100}%`; 
}

window.checkQ=function(i,btn){ 
    const q=window.activeQuiz.questions[window.qIdx]; 
    const ok=(i===q.correct); 
    btn.className=ok?'btn btn-success p-3 text-start':'btn btn-danger p-3 text-start'; 
    if(ok) window.quizScore++; 
    setTimeout(()=>{ 
        window.qIdx++; 
        if(window.qIdx<window.activeQuiz.questions.length) renderQuizQ(); 
        else finishQuiz(); 
    },1000); 
}

window.finishQuiz=function(){ 
    document.getElementById('quizQuestionArea').style.display='none'; 
    document.getElementById('quizResultArea').style.display='block'; 
    document.getElementById('finalScore').innerText=`${window.quizScore}/${window.activeQuiz.questions.length}`; 
    if(window.userData) window.updateDoc(window.doc(window.db,"users",window.auth.currentUser.uid),{experience:window.increment(window.quizScore*10)}); 
}

// ADMIN - QUIZ
window.loadQuizLibrary=async function(){ 
    const l=document.getElementById('quizLibraryList'); 
    const s=await window.getDocs(window.collection(window.db,"quizzes")); 
    let h=''; 
    s.forEach(d=>{ h+=`<div class="list-group-item d-flex justify-content-between"><div>U${d.data().unit} ${d.data().title}</div><button class="btn btn-sm btn-danger" onclick="deleteQuiz('${d.id}')">X</button></div>`; }); 
    l.innerHTML=h; 
}

window.deleteQuiz=async function(id){ 
    if(confirm('Apagar?')) await window.deleteDoc(window.doc(window.db,"quizzes",id)); 
    loadQuizLibrary(); 
}

window.resetQuizForm=function(){ 
    document.getElementById('quizId').value=''; 
    document.getElementById('questionsContainer').innerHTML=''; 
    addQuestionField(); 
    renderClassSelector('quizClassSelector'); 
}

window.addQuestionField=function(){ 
    document.getElementById('questionsContainer').insertAdjacentHTML('beforeend',`<div class="card p-2 mb-2 bg-light question-item"><input class="form-control mb-1 q-text" placeholder="Pergunta"><div class="row g-1"><div class="col-6"><input class="form-control q-opt" placeholder="A"></div><div class="col-6"><input class="form-control q-opt" placeholder="B"></div><div class="col-6"><input class="form-control q-opt" placeholder="C"></div><div class="col-6"><input class="form-control q-opt" placeholder="D"></div></div><select class="form-select mt-1 q-correct"><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div>`); 
}

window.saveQuiz=async function(){
    const tcs = getSelectedClasses('quizClassSelector'); 
    if(!tcs.length) return alert("Selecione Turma.");
    
    const q=[]; 
    document.querySelectorAll('.question-item').forEach(d=>{ 
        q.push({
            text:d.querySelector('.q-text').value, 
            options:[...d.querySelectorAll('.q-opt')].map(i=>i.value), 
            correct:parseInt(d.querySelector('.q-correct').value)
        }); 
    });
    
    const d={
        unit:parseInt(document.getElementById('quizUnit').value), 
        lesson:parseInt(document.getElementById('quizLesson').value), 
        title:document.getElementById('quizTitle').value, 
        questions:q, 
        targetClasses:tcs
    };
    
    await window.addDoc(window.collection(window.db,"quizzes"),d); 
    alert('Salvo!'); 
    loadQuizLibrary();
}

// ADMIN - UNSCRAMBLE
window.loadUnscrambleLibrary=async function(){ 
    const l=document.getElementById('unscrambleLibraryList'); 
    const s=await window.getDocs(window.collection(window.db,"unscramble_activities")); 
    let h=''; 
    s.forEach(d=>{ h+=`<div class="list-group-item d-flex justify-content-between"><div>${d.data().sentence}</div><button class="btn btn-sm btn-danger" onclick="deleteUnscramble('${d.id}')">X</button></div>`; }); 
    l.innerHTML=h; 
}

window.deleteUnscramble=async function(id){ 
    if(confirm('Apagar?')) await window.deleteDoc(window.doc(window.db,"unscramble_activities",id)); 
    loadUnscrambleLibrary(); 
}

window.saveUnscrambleActivity=async function(){
    const tcs = getSelectedClasses('unscrambleClassSelector'); 
    if(!tcs.length) return alert("Selecione Turma.");
    
    const d={
        unit:parseInt(document.getElementById('unscrambleUnit').value), 
        lesson:parseInt(document.getElementById('unscrambleLesson').value), 
        sentence:document.getElementById('unscrambleSentence').value, 
        translation:document.getElementById('unscrambleTranslation').value, 
        targetClasses:tcs
    };
    
    await window.addDoc(window.collection(window.db,"unscramble_activities"),d); 
    alert('Salvo!'); 
    loadUnscrambleLibrary();
}

window.resetUnscrambleForm=function(){ 
    document.querySelector('#adminTab-unscramble form').reset(); 
    renderClassSelector('unscrambleClassSelector'); 
}

// ATTENDANCE & OUTROS
window.initAttendanceTab=async function(){ 
    const d=new Date().toISOString().split('T')[0]; 
    document.getElementById('attDate').value=d; 
    document.getElementById('attHistoryMonth').value=d.slice(0,7); 
    
    const s=await window.getDocs(window.collection(window.db,"classes")); 
    let o='<option value="">Turma...</option>'; 
    s.forEach(d=>o+=`<option value="${d.id}">${d.data().name}</option>`); 
    document.getElementById('attClassSelect').innerHTML=o; 
    loadAttendanceHistory(); 
}

window.loadAttendanceSheet=async function(){ 
    const cid=document.getElementById('attClassSelect').value; 
    const dt=document.getElementById('attDate').value; 
    if(!cid||!dt)return;
    
    const docSnap=await window.getDoc(window.doc(window.db,"attendance",`${cid}_${dt}`)); 
    window.originalAttendanceData=docSnap.exists()?docSnap.data().records:{};
    
    const s=await window.getDocs(window.query(window.collection(window.db,"users"),window.where("classId","==",cid),window.orderBy("name")));
    let h=''; window.currentAttendanceData={};
    
    s.forEach(d=>{ 
        const st=window.originalAttendanceData[d.id]||'P'; 
        window.currentAttendanceData[d.id]=st; 
        const cls=st==='P'?'btn-success':(st==='A'?'btn-warning':'btn-danger'); 
        const txt=st==='P'?'PRESENTE':(st==='A'?'ATRASO':'FALTOU');
        h+=`<tr><td>${d.data().name}</td><td><button class="btn btn-sm w-100 fw-bold ${cls}" onclick="togglePresence('${d.id}',this)">${txt}</button></td></tr>`; 
    });
    
    document.getElementById('attendanceListBody').innerHTML=h||'<tr><td>Vazio</td></tr>'; 
    document.getElementById('attendanceSheetArea').style.display='block'; 
    document.getElementById('attendanceEmptyState').style.display='none';
}

window.togglePresence=function(id,btn){ 
    const m={'P':'A','A':'F','F':'P'}; 
    const c={'P':'btn-success','A':'btn-warning','F':'btn-danger'}; 
    const t={'P':'PRESENTE','A':'ATRASO','F':'FALTOU'};
    const n=m[window.currentAttendanceData[id]]; 
    window.currentAttendanceData[id]=n; 
    btn.className=`btn btn-sm w-100 fw-bold ${c[n]}`; 
    btn.innerText=t[n];
}

window.saveAttendance=async function(){
    const cid=document.getElementById('attClassSelect').value; 
    const dt=document.getElementById('attDate').value;
    const xp={'P':10,'A':-5,'F':-20};
    
    for(const [uid,nst] of Object.entries(window.currentAttendanceData)){
        const ost=window.originalAttendanceData[uid]; 
        if(ost===nst)continue;
        const delta=xp[nst]-(ost?xp[ost]:0); 
        if(delta!==0) await window.updateDoc(window.doc(window.db,"users",uid),{experience:window.increment(delta)});
    }
    
    const vals=Object.values(window.currentAttendanceData); 
    const stats={total:vals.length, presents:vals.filter(v=>v==='P').length, percentage:Math.round((vals.filter(v=>v==='P').length/vals.length)*100)};
    await window.setDoc(window.doc(window.db,"attendance",`${cid}_${dt}`),{classId:cid, date:dt, records:window.currentAttendanceData, stats, teacherId:window.auth.currentUser.uid});
    alert('Salvo!'); 
    loadAttendanceHistory();
}

window.loadAttendanceHistory=async function(){
    const m=document.getElementById('attHistoryMonth').value; 
    const s=await window.getDocs(window.query(window.collection(window.db,"attendance"),window.where("date",">=",m+"-01"),window.where("date","<=",m+"-31"),window.orderBy("date","desc")));
    let h=''; 
    s.forEach(d=>{ 
        const a=d.data(); 
        h+=`<tr><td>${a.date.slice(8)}</td><td>${a.stats.percentage}%</td><td><button class="btn btn-sm btn-primary" onclick="document.getElementById('attDate').value='${a.date}';document.getElementById('attClassSelect').value='${a.classId}';loadAttendanceSheet()">Edit</button></td></tr>`; 
    });
    document.getElementById('attHistoryBody').innerHTML=h||'<tr><td>Vazio</td></tr>';
}

// Exportações (Garante que tudo esteja acessível)
window.startSpaceShooterGame = startSpaceShooterGame;
window.stopSpaceShooter = stopSpaceShooter;
