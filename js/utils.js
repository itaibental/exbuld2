const Utils = {
    isHTML5Video: function(url) {
        if(!url) return false;
        return /\.(mp4|webm|ogg|mov)($|\?)/i.test(url);
    },

    getVideoEmbedUrl: function(url) {
        if (!url) return null;
        const driveMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (driveMatch && url.includes('drive.google.com')) {
            return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
        }
        const iframeMatch = url.match(/src=["'](.*?)["']/);
        const link = iframeMatch ? iframeMatch[1] : url;
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?"]*).*/;
        const ytMatch = link.match(ytRegExp);
        if (ytMatch && ytMatch[2].length === 11) {
            return `https://www.youtube.com/embed/${ytMatch[2]}?rel=0`;
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
        const setup = (handleId, panelId, isRight) => {
            const handle = document.getElementById(handleId);
            const panel = document.getElementById(panelId);
            if(!handle || !panel) return;
            
            handle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                handle.classList.add('resizing');
                
                const onMove = (ev) => {
                    const width = isRight ? window.innerWidth - ev.clientX : ev.clientX;
                    if(width > 200 && width < window.innerWidth * 0.6) {
                        panel.style.width = width + 'px';
                        panel.style.flex = 'none';
                    }
                };
                
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    handle.classList.remove('resizing');
                };
                
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        };
        
        setup('dragHandleRight', 'rightPanel', true);
        setup('dragHandleLeft', 'leftPanel', false);
    }
};
