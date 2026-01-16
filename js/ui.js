const UI = {
    elements: {},
    
    initElements: function() {
        const ids = [
            'qPart', 'partNameInput', 'partInstructions', 'partNameLabel', 
            'qPoints', 'qText', 'qModelAnswer', 'qVideo', 'qEmbed', 'qImage', 
            'previewQuestionsContainer', 'statsContainer', 'totalPoints', 
            'studentNameInput', 'filenamePreview', 'previewTabs', 
            'examInstructions', 'previewInstructionsBox', 'examTitleInput', 
            'previewExamTitle', 'previewLogo', 'examDurationInput', 
            'unlockCodeInput', 'teacherEmailInput', 'driveFolderInput', 
            'subQuestionsList', 'mainModelAnswerContainer', 
            'toastContainer', 'confirmModal', 'previewPartInstructions',
            'vc-download', 'vc-fullscreen', 'vc-playbackrate', 'vc-pip'
        ];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if(el) this.elements[id] = el;
        });
    },

    showToast: function(msg, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        this.elements.toastContainer.appendChild(toast);
        void toast.offsetWidth; // Reflow
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
            container.innerHTML = `<div style="text-align: center; color: #bdc3c7; margin-top: 50px;"><h3>עדיין אין שאלות בחלק זה</h3></div>`;
            return;
        }

        const questionsHTML = filtered.map((q, idx) => {
            let mediaHTML = '';
            let vidId = `vid-preview-${q.id}`;
            
            if (q.embedCode) {
                let safeEmbed = q.embedCode.replace(/allowfullscreen/gi, '');
                mediaHTML += `<div class="media-container embed-container">${safeEmbed}</div>`;
            } else if (Utils.isHTML5Video(q.videoUrl)) {
                const c = q.videoControls || { download: false, fullscreen: false, playbackrate: true, pip: false };
                let cl = [];
                if(!c.download) cl.push('nodownload');
                if(!c.fullscreen) cl.push('nofullscreen');
                if(!c.playbackrate) cl.push('noplaybackrate');
                if(!c.pip) cl.push('nopip');
                let attrs = !c.pip ? 'disablePictureInPicture' : '';
                mediaHTML += `<div class="video-wrapper" style="padding-bottom:0; height:auto; background:black;"><video controls playsinline controlsList="${cl.join(' ')}" ${attrs} src="${q.videoUrl}" style="width:100%; border-radius:8px; display:block;"></video></div>`;
            } else {
                const embedSrc = Utils.getVideoEmbedUrl(q.videoUrl);
                if (embedSrc) mediaHTML += `<div class="video-wrapper"><iframe src="${embedSrc}" frameborder="0"></iframe></div>`;
            }

            const imgSrc = Utils.getImageSrc(q.imageUrl);
            if (imgSrc) mediaHTML += `<div class="image-wrapper"><img src="${imgSrc}" alt="Question Image"></div>`;

            let contentHTML = '';
            if (q.subQuestions && q.subQuestions.length > 0) {
                contentHTML = q.subQuestions.map((sq, si) => {
                    const label = ExamState.subLabels[si] || (si + 1);
                    return `<div class="preview-sub-q">
                        <div class="preview-sub-badge">${label}' (${sq.points} נק')</div>
                        <div class="q-text">${sq.text}</div>
                        <div class="preview-input" style="height:60px;">תשובה...</div>
                    </div>`;
                }).join('');
            } else {
                contentHTML = `<div class="preview-input">תיבת טקסט...</div>`;
            }

            return `<div class="question-card">
                <div class="card-actions">
                    <button class="btn-edit" onclick="App.editQuestion(${q.id})">✏️ עריכה</button>
                    <button class="btn-delete" onclick="App.deleteQuestion(${q.id})">🗑️ הסרה</button>
                </div>
                <div class="badge">שאלה ${idx + 1} • ${q.points} נקודות</div>
                <div class="q-text">${q.text}</div>
                ${mediaHTML}
                ${contentHTML}
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

        const total = ExamState.tempSubQuestions.reduce((acc, curr) => acc + (curr.points || 0), 0);
        if (ExamState.tempSubQuestions.length > 0) {
            this.elements.qPoints.value = total;
            this.elements.qPoints.disabled = true;
            this.elements.mainModelAnswerContainer.style.display = 'none';
        } else {
            this.elements.qPoints.disabled = false;
            this.elements.mainModelAnswerContainer.style.display = 'block';
        }
    }
};
