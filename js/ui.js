const UI = {
    elements: {},
    initElements: function() {
        const idList = [
            'qPart', 'partNameInput', 'partInstructions', 'partNameLabel', 
            'qPoints', 'qText', 'qModelAnswer', 'qVideo', 'qImage', 
            'previewQuestionsContainer', 'statsContainer', 'totalPoints', 
            'studentNameInput', 'filenamePreview', 'previewTabs', 
            'examInstructions', 'previewInstructionsBox', 'examTitleInput', 
            'previewExamTitle', 'previewLogo', 'examDurationInput', 
            'unlockCodeInput', 'teacherEmailInput', 'driveFolderInput', 
            'subQuestionsList', 'mainModelAnswerContainer', 
            'toastContainer', 'confirmModal',
            'previewPartInstructions',
            'vidOptControls', 'vidOptBranding', 'vidOptRelated'
        ];
        idList.forEach(id => {
            const el = document.getElementById(id);
            if(el) this.elements[id] = el;
        });
    },
    showToast: function(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        this.elements.toastContainer.appendChild(toast);
        void toast.offsetWidth; 
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    showConfirm: function(title, text, callback) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        this.elements.confirmModal.classList.add('open');
        this.confirmCallback = callback;
    },
    closeModal: function() {
        this.elements.confirmModal.classList.remove('open');
        this.confirmCallback = null;
    },
    renderPartSelector: function() {
        const el = this.elements.qPart;
        el.innerHTML = '';
        ExamState.parts.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            el.appendChild(opt);
        });
        el.value = ExamState.currentTab;
    },
    renderTabs: function() {
        const container = this.elements.previewTabs;
        container.innerHTML = '';
        ExamState.parts.forEach(p => {
            const div = document.createElement('div');
            div.className = `tab ${p.id === ExamState.currentTab ? 'active' : ''}`;
            div.textContent = p.name;
            div.onclick = () => App.setTab(p.id);
            container.appendChild(div);
        });
    },
    updatePartInstructionsInput: function(text) {
        if(this.elements.previewPartInstructions) {
            this.elements.previewPartInstructions.value = text || '';
        }
    },
    updateStats: function() {
        const container = this.elements.statsContainer;
        container.innerHTML = '';
        let total = 0;
        ExamState.parts.forEach(p => {
            const count = ExamState.questions.filter(q => q.part === p.id).length;
            const div = document.createElement('div');
            div.className = 'stat-row';
            div.innerHTML = `<span>${p.name}:</span> <span>${count}</span>`;
            container.appendChild(div);
        });
        ExamState.questions.forEach(q => total += q.points);
        this.elements.totalPoints.textContent = total;
    },
    renderPreview: function() {
        const container = this.elements.previewQuestionsContainer;
        const currentPartId = ExamState.currentTab;
        const filtered = ExamState.questions.filter(q => q.part === currentPartId);
        if (filtered.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; color: #bdc3c7; margin-top: 50px;">
                <h3>עדיין אין שאלות בחלק זה</h3>
                <p>הוסף שאלות מהתפריט הימני</p>
            </div>`;
            return;
        }
        const questionsHTML = filtered.map((q, idx) => {
            let mediaHTML = '';
            const imgSrc = Utils.getImageSrc(q.imageUrl);
            if (imgSrc) mediaHTML += `<div class="image-wrapper"><img src="${imgSrc}" alt="Question Image"></div>`;
            const embedSrc = Utils.getVideoEmbedUrl(q.videoUrl, q.videoOptions);
            if (embedSrc) mediaHTML += `<div class="video-wrapper"><div class="video-shield"></div><iframe sandbox="allow-scripts allow-same-origin allow-presentation" src="${embedSrc}" frameborder="0"></iframe></div>`;
            let subQuestionsHTML = '';
            let modelAnsPreview = '';
            if (q.subQuestions && q.subQuestions.length > 0) {
                subQuestionsHTML = q.subQuestions.map((sq, si) => {
                    const label = ExamState.subLabels[si] || (si + 1);
                    return `<div class="preview-sub-q">
                        <div class="preview-sub-badge">${label}' (${sq.points} נק')</div>
                        <div style="margin-bottom:10px;">${sq.text}</div>
                        <div class="preview-input" style="height:8vh;">תשובה לסעיף...</div>
                        ${sq.modelAnswer ? `<div style="background:#fff3cd; padding:0.5vh; margin-top:0.5vh; border-radius:0.4em; font-size:0.8rem; color:#856404; border:1px solid #ffeeba;"><strong>👁️ מחוון:</strong> ${sq.modelAnswer}</div>` : ''}
                    </div>`;
                }).join('');
            } else {
                modelAnsPreview = q.modelAnswer ? `<div style="background:#fff3cd; padding:1vh; margin-top:1vh; border-radius:0.4em; font-size:0.9rem; color:#856404; border:1px solid #ffeeba;"><strong>👁️ מחוון למורה:</strong> ${q.modelAnswer}</div>` : '';
            }
            return `
            <div class="question-card">
                <div class="card-actions">
                    <button class="btn-edit" onclick="App.editQuestion(${q.id})">✏️ עריכה</button>
                    <button class="btn-delete" onclick="App.deleteQuestion(${q.id})">🗑️ הסרה</button>
                </div>
                <div class="badge">שאלה ${idx + 1} • ${q.points} נקודות</div>
                <div class="q-text">${q.text}</div>
                ${mediaHTML}
                ${q.subQuestions && q.subQuestions.length > 0 ? subQuestionsHTML : '<div class="preview-input">תיבת טקסט לתשובת התלמיד...</div>'}
                ${modelAnsPreview}
            </div>`;
        }).join('');
        container.innerHTML = questionsHTML;
    },
    renderSubQuestionInputs: function() {
        const list = this.elements.subQuestionsList;
        list.innerHTML = '';
        ExamState.tempSubQuestions.forEach((sq, idx) => {
            const label = ExamState.subLabels[idx] || (idx + 1);
            const row = document.createElement('div');
            row.className = 'sub-q-row';
            row.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <strong>סעיף ${label}'</strong>
                    <button class="btn-small-remove" onclick="App.removeSubQuestionField(${sq.id})">❌</button>
                </div>
                <textarea placeholder="תוכן הסעיף" oninput="App.updateSubQuestionData(${sq.id}, 'text', this.value)" style="margin-bottom:5px; height: 60px; min-height: 40px;">${sq.text}</textarea>
                <div style="display:flex; gap:10px;">
                    <input type="number" placeholder="נקודות" value="${sq.points}" oninput="App.updateSubQuestionData(${sq.id}, 'points', parseInt(this.value)||0)" style="width:80px;">
                </div>
            `;
            list.appendChild(row);
        });
        if (ExamState.tempSubQuestions.length > 0) {
            const total = ExamState.tempSubQuestions.reduce((acc, curr) => acc + (curr.points || 0), 0);
            this.elements.qPoints.value = total;
            this.elements.qPoints.disabled = true;
            this.elements.mainModelAnswerContainer.style.display = 'none';
        } else {
            this.elements.qPoints.disabled = false;
            this.elements.mainModelAnswerContainer.style.display = 'block';
        }
    }
};