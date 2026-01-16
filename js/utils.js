const Utils = {
    getVideoEmbedUrl: function(url, options = { showControls: true, modestBranding: true, showRelated: false }) {
        if (!url) return null;
        
        // Google Drive Handling
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        
        // YouTube Handling
        const iframeMatch = url.match(/src=["'](.*?)["']/);
        const link = iframeMatch ? iframeMatch[1] : url;
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?"]*).*/;
        const ytMatch = link.match(ytRegExp);
        
        if (ytMatch && ytMatch[2].length === 11) {
            const videoId = ytMatch[2];
            
            // Build parameters based on options
            let params = [];
            
            // Controls (0 = hide, 1 = show)
            if (options.showControls === false) params.push('controls=0');
            
            // Modest Branding (1 = no logo, 0 = logo)
            if (options.modestBranding === true) params.push('modestbranding=1');
            
            // Related Videos (0 = hide/show from same channel, 1 = show all)
            // Note: Since 2018 rel=0 only restricts to same channel, cannot fully disable.
            if (options.showRelated === false) params.push('rel=0');
            
            // Default params
            params.push('showinfo=0');
            params.push('iv_load_policy=3'); // Hide annotations
            
            const queryString = params.length > 0 ? '?' + params.join('&') : '';
            return `https://www.youtube-nocookie.com/embed/${videoId}${queryString}`;
        }
        return null;
    },

    getImageSrc: function(url) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
        }
        return url;
    },

    simpleHash: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return hash.toString();
    },

    setupResizers: function() {
        // Setup Right Resizer (להזזת החלק הימני שמאלה)
        const resizerRight = document.getElementById('dragHandleRight');
        const rightCol = document.getElementById('rightPanel');
        
        if (resizerRight && rightCol) {
            resizerRight.addEventListener('mousedown', (e) => {
                e.preventDefault();
                
                // שינוי סמן ומניעת בחירת טקסט בזמן גרירה
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                
                resizerRight.classList.add('resizing');
                
                const onMove = (e) => {
                    // חישוב הרוחב החדש: מכיוון שאנחנו ב-RTL והפאנל מימין,
                    // הרוחב הוא המרחק מהקצה הימני של המסך (window.innerWidth) עד סמן העכבר (e.clientX)
                    const newWidth = window.innerWidth - e.clientX;
                    
                    // הגבלת גבולות (מינימום 200px, מקסימום 60% מהמסך)
                    if (newWidth > 200 && newWidth < window.innerWidth * 0.6) {
                        rightCol.style.width = newWidth + 'px';
                        rightCol.style.flex = 'none'; // ביטול ה-flex כדי שה-width יקבע
                    }
                };
                
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    
                    // החזרת מצב ברירת מחדל
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = '';
                    resizerRight.classList.remove('resizing');
                };
                
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }

        // Setup Left Resizer
        const resizerLeft = document.getElementById('dragHandleLeft');
        const leftCol = document.getElementById('leftPanel');
        
        if (resizerLeft && leftCol) {
            resizerLeft.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                
                resizerLeft.classList.add('resizing');
                
                const onMove = (e) => {
                    // הפאנל השמאלי מוצמד לשמאל, הרוחב הוא פשוט מיקום העכבר
                    const newWidth = e.clientX;
                    if (newWidth > 150 && newWidth < window.innerWidth * 0.4) {
                        leftCol.style.width = newWidth + 'px';
                        leftCol.style.flex = 'none';
                    }
                };
                
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.cursor = 'default';
                    document.body.style.userSelect = '';
                    resizerLeft.classList.remove('resizing');
                };
                
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }
    }
};
