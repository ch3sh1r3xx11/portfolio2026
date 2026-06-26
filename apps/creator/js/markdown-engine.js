// markdown-engine.js

/**
 * Zmienia strukturę DOM (szklane karty) na czysty Markdown
 * @param {HTMLElement} container - Kontener z elementami .glass-card
 * @returns {string} - Kod Markdown z ukrytym komentarzem metadanych na końcu
 */
export function serializeToMarkdown(container) {
    const cards = container.querySelectorAll('.glass-card');
    let mdOutput = '';
    let metadata = { cards: [] };

    cards.forEach((card, index) => {
        // Zapisz pozycję karty
        const styleTransform = card.style.transform;
        const rect = card.getBoundingClientRect();
        metadata.cards.push({
            id: `card-${index}`,
            transform: styleTransform,
            width: rect.width,
            height: rect.height
        });

        // 1. Znajdź nagłówek karty (zawsze H1 w markdownie dla nowej karty)
        const heading = card.querySelector('.module-heading');
        if (heading) {
            mdOutput += `# ${heading.textContent.trim()}\n\n`;
        } else {
            mdOutput += `# Bez Tytułu\n\n`;
        }

        // 2. Pobierz wszystkie bloki (notatki, KPI, listy) w kolejności DOM
        const children = card.children;
        for (let i = 0; i < children.length; i++) {
            const child = children[i];

            if (child.classList.contains('module-heading') || child.classList.contains('card-delete-btn')) {
                continue; // Pomijamy, bo nagłówek już ogarnięty, a button 'x' nas nie obchodzi
            }

            if (child.classList.contains('block-note')) {
                // Jeśli jest to block-note, może zawierać tagi HTML takie jak <strong> lub <br>.
                // Na razie wyciągamy po prostu innerText, żeby był czysty MD,
                // ale zachowujemy formatowanie linii.
                // Replace \n with standard markdown double space + \n for break
                let text = child.innerHTML
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
                    .replace(/<[^>]*>?/gm, ''); // Usuń resztę HTML
                
                mdOutput += `${text.trim()}\n\n`;
            } 
            else if (child.classList.contains('block-kpi')) {
                // To jest checkbox
                const checkbox = child.querySelector('input[type="checkbox"]');
                const span = child.querySelector('span');
                const isChecked = checkbox && checkbox.checked ? '[x]' : '[ ]';
                
                // Czasami w block-kpi nie ma spanu (zły stary kod), więc bierzemy textContent całości poza checkboxem
                let text = '';
                if (span) {
                    text = span.innerHTML
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                        .replace(/<[^>]*>?/gm, '');
                } else {
                    text = child.textContent.trim();
                }

                mdOutput += `- ${isChecked} ${text.trim()}\n`;
            }
            else if (child.classList.contains('block-ai')) {
                // Specyficzny blok AI
                let text = child.innerHTML
                    .replace(/<br\s*\/?>/gi, '\n')
                    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
                    .replace(/<[^>]*>?/gm, '');
                mdOutput += `> ${text.trim().split('\n').join('\n> ')}\n\n`;
            }
        }
        
        // Dodaj odstęp na końcu karty
        mdOutput += `\n---\n\n`; 
    });

    // Usuwamy ostatni separator '---' i dodajemy metadane na koniec pliku
    mdOutput = mdOutput.trim();
    if (mdOutput.endsWith('---')) {
        mdOutput = mdOutput.slice(0, -3).trim();
    }

    const metaString = JSON.stringify(metadata);
    mdOutput += `\n\n<!-- Kreator Meta: ${metaString} -->\n`;

    return mdOutput;
}

/**
 * Parsuje kod Markdown i generuje strukturę DOM (szklane karty)
 * @param {string} mdString - Kod Markdown
 * @returns {string} - Zbudowany HTML (gotowy do wklejenia w innerHTML płótna)
 */
export function parseFromMarkdown(mdString) {
    let htmlOutput = '';
    let metadata = null;

    // 1. Odseparuj metadane jeśli istnieją
    const metaRegex = /<!-- Kreator Meta: (.*?) -->/s;
    const match = mdString.match(metaRegex);
    if (match && match[1]) {
        try {
            metadata = JSON.parse(match[1]);
        } catch(e) {
            console.error("Błąd parsowania metadanych:", e);
        }
    }
    
    // Czysty MD bez metadanych
    let cleanMd = mdString.replace(metaRegex, '').trim();

    // 2. Podziel MD na sekcje (karty) za pomocą nagłówka H1 (#) lub separatora (---)
    // Bezpieczniej ciąć po separatorze --- jeśli go użyliśmy, albo po '# ' (pamiętając o lookahead)
    const cardsText = cleanMd.split(/(?=\n# )|(?=\n---)/);

    let currentY = 0; // Jeśli nie ma metadanych, będziemy układać karty jedna pod drugą

    cardsText.forEach((cardText, index) => {
        let text = cardText.trim();
        if (!text) return;
        
        // Usuwamy ewentualny separator z początku
        if (text.startsWith('---')) {
            text = text.substring(3).trim();
        }
        if (!text) return;

        // Domyślny styl karty (pionowy stos)
        let transformStyle = `transform: translate(0px, ${currentY}px);`;
        if (metadata && metadata.cards && metadata.cards[index]) {
            transformStyle = metadata.cards[index].transform || transformStyle;
        }

        let cardHtml = `<div class="glass-card" data-observed="true" style="${transformStyle} transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s, border-color 0.3s;">\n`;

        // Analizujemy linijka po linijce
        const lines = text.split('\n');
        
        let insideBlockNote = false;
        let noteContent = [];

        const flushNote = () => {
            if (noteContent.length > 0) {
                // Przekształcamy markdownowe boldy na HTML
                let parsedText = noteContent.join('<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');
                cardHtml += `  <div class="block-note">${parsedText}</div>\n`;
                noteContent = [];
            }
        };

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('# ')) {
                flushNote();
                let title = line.substring(2).trim();
                // Sprawdzamy typ po nazwie, domyślnie magenta
                let colorClass = 'magenta';
                let dataType = 'goal';
                if (title.toLowerCase().includes('zadania') || title.toLowerCase().includes('zakres') || title.toLowerCase().includes('sukces')) colorClass = 'teal';
                cardHtml += `  <h2 class="module-heading ${colorClass}" data-type="${dataType}">${title}</h2>\n`;
            }
            else if (line.startsWith('- [x]') || line.startsWith('- [X]')) {
                flushNote();
                let taskText = line.substring(5).trim()
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                cardHtml += `  <div class="block-kpi"><input type="checkbox" checked="checked"><span>${taskText}</span></div>\n`;
            }
            else if (line.startsWith('- [ ]')) {
                flushNote();
                let taskText = line.substring(5).trim()
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                cardHtml += `  <div class="block-kpi"><input type="checkbox"><span>${taskText}</span></div>\n`;
            }
            else if (line.startsWith('> ')) {
                flushNote();
                let quoteText = line.substring(2).trim()
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                cardHtml += `  <div class="block-ai"><strong>[Antigravity AI]:</strong> ${quoteText}</div>\n`;
            }
            else {
                // Zwykły tekst gromadzimy w block-note
                noteContent.push(line);
            }
        }
        flushNote(); // Na wypadek, gdyby na końcu pliku była notatka

        cardHtml += `<button class="card-delete-btn">x</button></div>\n`;
        htmlOutput += cardHtml;
        
        currentY += 400; // Przesunięcie dla kolejnej karty w fallbacku
    });

    return htmlOutput;
}
