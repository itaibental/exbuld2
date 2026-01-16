const StudentCode = {
    getScript: function(duration, unlockCodeHash, teacherEmail, driveLink, solutionDataUrl) {
        return `
        <script>
        let totalTime=${duration}*60;
        let timerInterval;
        let examStarted=false;
        let isExtraTime = false;
        let extraTimeSeconds = 0;

        function simpleHash(s){let h=0;for(let i=0;i<s.length;i++)h=(h<<5)-h+s.charCodeAt(i)|0;return h.toString();}
        
        window.onload = function() {
            if(document.body.dataset.status === 'submitted') {
                document.getElementById('startScreen').style.display='none';
                document.getElementById('mainContainer').style.filter='none';
                document.getElementById('timerBadge').style.display='none';
                document.getElementById('successModal').style.display='flex';
                document.querySelectorAll('input,textarea').forEach(e=>{
                    if(!e.classList.contains('grade-input') && !e.classList.contains('teacher-comment') && e.id !== 'teacherCodeInput') {
                        e.setAttribute('readonly','true');
                        e.disabled = true;
                    }
                });
                document.querySelector('.student-submit-area').style.display='none';
            }
        };

        function startExamTimer(){
            document.documentElement.requestFullscreen().catch(e=>console.log(e));
            document.getElementById('startScreen').style.display='none';
            document.getElementById('mainContainer').style.filter='none';
            document.getElementById('timerBadge').style.display='block';
            examStarted=true;
            runTimer();
            updateTimer();
        }

        function runTimer(){
            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (!isExtraTime) {
                    totalTime--;
                    if (totalTime <= 0) {
                        clearInterval(timerInterval);
                        document.getElementById('timesUpModal').style.display = 'flex';
                    }
                } else {
                    extraTimeSeconds++;
                }
                updateTimer();
            }, 1000);
        }

        function updateTimer(){
            let displaySeconds = isExtraTime ? extraTimeSeconds : totalTime;
            let m = Math.floor(displaySeconds / 60);
            let s = displaySeconds % 60;
            let text = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
            
            const timerEl = document.getElementById('timerText');
            timerEl.innerText = text;
            
            if (isExtraTime) {
                timerEl.style.color = 'red';
                document.getElementById('extraTimeLabel').style.display = 'inline';
            } else {
                timerEl.style.color = 'inherit';
                document.getElementById('extraTimeLabel').style.display = 'none';
            }
        }

        function requestExtraTime() {
            const code = prompt('הכנס קוד מורה לאישור תוספת זמן:');
            if (simpleHash(code) === "${unlockCodeHash}") {
                document.getElementById('timesUpModal').style.display = 'none';
                isExtraTime = true;
                runTimer();
            } else {
                alert('קוד שגוי');
            }
        }

        function showPart(id){document.querySelectorAll('.exam-section').forEach(e=>e.classList.remove('active'));document.getElementById('part-'+id).classList.add('active');document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');}
        
        function calcTotal(){
            let t=0;
            document.querySelectorAll('.grade-input').forEach(i=>{
                if(i.value) t += parseFloat(i.value);
            });
            const display = document.getElementById('teacherCalculatedScore');
            if(display) display.innerText = t;
        }
        
        // Drag Resize Logic
        let startX, startWidth, resizableEl;
        function initResize(e, id) {
            e.preventDefault();
            resizableEl = document.getElementById(id);
            startX = e.clientX;
            startWidth = resizableEl.offsetWidth;
            
            const iframe = resizableEl.querySelector('iframe');
            if(iframe) iframe.style.pointerEvents = 'none';
            
            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
        }
        function doResize(e) {
            const dx = startX - e.clientX;
            const newWidth = startWidth + dx;
            if(newWidth > 200 && newWidth <= resizableEl.parentElement.offsetWidth) {
                resizableEl.style.width = newWidth + 'px';
            }
        }
        function stopResize() {
            const iframe = resizableEl.querySelector('iframe');
            if(iframe) iframe.style.pointerEvents = 'auto';
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
        }

        let markerColor = null;
        function setMarker(color, btn) {
            markerColor = color;
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            if(color) {
                const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="\${color}" stroke="black" stroke-width="1" d="M28.06 6.94L25.06 3.94a2.003 2.003 0 0 0-2.83 0l-16.17 16.17a2.003 2.003 0 0 0-.58 1.41V26h4.48c.53 0 1.04-.21 1.41-.59l16.17-16.17c.79-.78.79-2.05.52-2.3zM8.5 24H7v-1.5l14.5-14.5 1.5 1.5L8.5 24z"/><path fill="\${color}" d="M4 28l4-4H4z"/></svg>\`;
                const url = 'data:image/svg+xml;base64,' + btoa(svg);
                document.body.style.cursor = \`url('\${url}') 0 32, auto\`;
            } else {
                document.body.style.cursor = 'default';
            }
        }
        
        document.addEventListener('mouseup', () => {
            if (!markerColor) return;
            const sel = window.getSelection();
            if (sel.rangeCount > 0 && !sel.isCollapsed) {
                const range = sel.getRangeAt(0);
                const common = range.commonAncestorContainer;
                if(common.nodeType === 1 && (common.closest('#highlighterTool') || common.tagName === 'TEXTAREA' || common.tagName === 'INPUT')) return;
                if(common.nodeType === 3 && (common.parentNode.closest('#highlighterTool') || common.parentNode.tagName === 'TEXTAREA')) return;

                document.designMode = "on";
                if(document.queryCommandEnabled("hiliteColor")) {
                    document.execCommand("styleWithCSS", false, true);
                    document.execCommand("hiliteColor", false, markerColor);
                }
                document.designMode = "off";
                sel.removeAllRanges();
            }
        });

        const tool = document.getElementById('highlighterTool');
        const handle = document.getElementById('hlDragHandle');
        let isDragging = false, startX_tool, startY_tool, initialLeft, initialTop;
        handle.onmousedown = function(e) {
            e.preventDefault(); isDragging=true; startX_tool=e.clientX; startY_tool=e.clientY; initialLeft=tool.offsetLeft; initialTop=tool.offsetTop;
            document.onmouseup = function(){isDragging=false; document.onmouseup=null; document.onmousemove=null;};
            document.onmousemove = function(e){if(!isDragging)return; tool.style.top=(initialTop+e.clientY-startY_tool)+"px"; tool.style.left=(initialLeft+e.clientX-startX_tool)+"px"; tool.style.right='auto';};
        };

        function lockExam(){ 
            if (document.hidden) {
                clearInterval(timerInterval); 
                document.getElementById('securityModal').style.display='flex'; 
            }
        }
        
        function checkSec(){ 
            if(!examStarted || document.body.dataset.status==='submitted') return; 
            if(document.hidden){
                lockExam();
            }
        }
        
        document.addEventListener('visibilitychange', checkSec);
        document.addEventListener('fullscreenchange', () => {}); 

        function unlockExam(){ 
            if(simpleHash(document.getElementById('teacherCodeInput').value)==="${unlockCodeHash}"){ 
                document.getElementById('securityModal').style.display='none'; 
                document.documentElement.requestFullscreen().catch(e=>console.log(e)); 
                runTimer(); 
            } else { 
                alert('קוד שגוי'); 
            } 
        }

        function submitExam(){
            document.body.dataset.status='submitted';
            if(document.fullscreenElement) document.exitFullscreen();
            clearInterval(timerInterval); document.getElementById('timerBadge').style.display='none';
            document.querySelectorAll('input,textarea').forEach(e=>{e.setAttribute('value',e.value); if(!e.classList.contains('grade-input')&&!e.classList.contains('teacher-comment')) { e.setAttribute('readonly','true'); e.disabled=true; } });
            document.querySelectorAll('textarea').forEach(t=>t.innerHTML=t.value);
            
            const html="<!DOCTYPE html>"+document.documentElement.outerHTML;
            const b=new Blob([html],{type:'text/html'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download="פתור-"+(document.getElementById('studentNameField').value||'תלמיד')+".html"; a.click();
            
            document.getElementById('successModal').style.display='flex';
            
            const acts=document.getElementById('submissionActions');
            if("${teacherEmail}"){const l="https://mail.google.com/mail/?view=cm&to=${teacherEmail}&su=Exam Submission&body=Attached";acts.innerHTML+='<a href="'+l+'" target="_blank" style="display:block;margin:10px;padding:10px;background:#3498db;color:white;text-decoration:none;">שלח במייל (צרף קובץ!)</a>';}
            if("${driveLink}"){acts.innerHTML+='<a href="${driveLink}" target="_blank" style="display:block;margin:10px;padding:10px;background:#f1c40f;color:black;text-decoration:none;">העלה לדרייב</a>';}
        }

        function enableGradingFromModal() {
             if(simpleHash(prompt('הכנס קוד מורה:'))==="${unlockCodeHash}") {
                 document.getElementById('successModal').style.display='none';
                 document.getElementById('timesUpModal').style.display='none'; 
                 enableGradingUI();
             } else { alert('קוד שגוי'); }
        }

        function enableGrading() { 
             if(simpleHash(prompt('Code?'))==="${unlockCodeHash}") { enableGradingUI(); }
        }

        function enableGradingUI() {
            document.querySelector('.teacher-controls').style.display='block';
            document.querySelectorAll('.grading-area').forEach(e=>e.style.display='block');
            document.querySelectorAll('.grade-input, .teacher-comment').forEach(e=>e.disabled=false);
            
            document.querySelectorAll('.student-ans').forEach(e => {
                e.removeAttribute('readonly');
                e.disabled = false;
                e.style.borderColor = '#3498db'; 
            });

            document.querySelectorAll('.model-answer-secret').forEach(e=>e.style.display='block');
            document.querySelector('.student-submit-area').style.display='none';
            document.body.dataset.status = 'grading';
            document.querySelectorAll('.exam-section').forEach(e=>e.style.display='block');
            document.querySelector('.tabs').style.display='none';

            if("${solutionDataUrl}"){
                document.getElementById('teacherSolutionContainer').style.display='block';
                document.getElementById('solutionFrame').src="${solutionDataUrl}";
            }
        }

        function saveGradedExam(){
            document.querySelectorAll('input,textarea').forEach(i=>i.setAttribute('value',i.value));
            document.querySelectorAll('textarea').forEach(t=>t.innerHTML=t.value);
            const html="<!DOCTYPE html>"+document.documentElement.outerHTML;
            const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([html],{type:'text/html'})); 
            a.download="בדוק-"+document.getElementById('studentNameField').value+".html"; a.click();
        }

        function exportToDoc() {
            const studentName = document.getElementById('studentNameField').value || 'תלמיד';
            const finalScore = document.getElementById('teacherCalculatedScore').innerText || '0';
            
            let content = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">';
            content += '<head><meta charset="utf-8"><title>מבחן בדוק</title>';
            content += '<style>body{font-family: Arial, sans-serif; direction: rtl;} table{width:100%; border-collapse: collapse;} td, th{border: 1px solid #999; padding: 10px;} .q-box{border: 1px solid #ccc; padding: 10px; margin-bottom: 20px;} .teacher-feedback{background: #f0f8ff; padding: 5px; margin-top: 5px; border: 1px solid #3498db;}</style></head><body>';
            
            content += '<h1 style="text-align:center;">' + document.querySelector('h1').innerText + '</h1>';
            content += '<h2>שם התלמיד: ' + studentName + '</h2>';
            content += '<h3>ציון סופי: <span style="color:red">' + finalScore + '</span></h3><hr>';

            const blocks = document.querySelectorAll('.q-block, .sub-question-block');
            blocks.forEach((block, idx) => {
                const isSub = block.classList.contains('sub-question-block');
                const textDiv = block.querySelector('.q-content') || block.querySelector('.sub-q-text');
                const text = textDiv ? textDiv.innerText : 'שאלה ' + (idx+1);
                
                const ansArea = block.querySelector('.student-ans');
                const answer = ansArea ? ansArea.value : '(אין תשובה)';
                
                const gradeInp = block.querySelector('.grade-input');
                const grade = gradeInp ? gradeInp.value : '0';
                const maxPoints = block.dataset.points || block.querySelector('.grade-max')?.innerText.replace(/\\D/g,'') || '';
                
                const commentInp = block.querySelector('.teacher-comment');
                const comment = commentInp ? commentInp.value : '';

                content += '<div class="q-box">';
                content += '<p><strong>' + (isSub ? 'סעיף' : 'שאלה') + ':</strong> ' + text + '</p>';
                content += '<p><strong>תשובת התלמיד:</strong><br>' + answer.replace(/\\n/g, '<br>') + '</p>';
                
                if(grade || comment) {
                    content += '<div class="teacher-feedback">';
                    content += '<p><strong>ציון:</strong> ' + grade + (maxPoints ? ' מתוך ' + maxPoints : '') + '</p>';
                    if(comment) content += '<p><strong>הערת המורה:</strong> ' + comment + '</p>';
                    content += '</div>';
                }
                content += '</div>';
            });

            content += '</body></html>';

            const blob = new Blob(['\\ufeff', content], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'בדוק-' + studentName + '.doc'; 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        </script>`;
    }
};
