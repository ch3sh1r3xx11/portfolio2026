const projectData = [
    {
        id: 0,
        title: "PM Learning Roadmapa",
        themeColors: {
            primary: "var(--teal)",
            secondary: "var(--magenta)"
        },
        chips: [
            { text: "WBS", color: "var(--magenta)", rgb: "232,25,122" },
            { text: "Roadmapping", color: "var(--teal)", rgb: "0,201,200" }
        ],
        panels: [
            {
                subtitle: "Cel Projektu",
                content: "Stworzenie kompleksowego planu rozwoju na rok 2026 (Q1-Q4) pod kątem znalezienia zatrudnienia w IT jako PM / Project Coordinator."
            },
            {
                subtitle: "Zakres",
                content: "Rozbicie WBS na kursy (Google, PMI), budowanie portfolio publicznego oraz zdobywanie praktycznej wiedzy używając AI jako asystenta (Perplexity)."
            },
            {
                subtitle: "Status",
                content: "W realizacji (Q2)."
            }
        ]
    },
    {
        id: 1,
        title: "System Operacyjny 2026",
        themeColors: {
            primary: "var(--magenta)",
            secondary: "var(--teal)"
        },
        chips: [
            { text: "AI Dev", color: "var(--magenta)", rgb: "232,25,122" },
            { text: "HTML/JS", color: "var(--teal)", rgb: "0,201,200" }
        ],
        panels: [
            {
                subtitle: "Cel Projektu",
                content: "Budowa interfejsu (HTML/CSS/JS) łączącego notatki, projekty i zasoby w jedną aplikację offline-first działającą w LocalStorage."
            },
            {
                subtitle: "Rola AI",
                content: "Narzędzia LLM wygenerowały cały fundament kodu z moich promptów architektonicznych, co pozwoliło mi pominąć naukę syntaxu i skupić się na logice PM."
            },
            {
                subtitle: "Status",
                content: "Zakończone, działające lokalnie."
            }
        ]
    }
];
