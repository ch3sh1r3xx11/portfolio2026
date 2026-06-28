# Backlog i Priorytety

*Lista pomysłów do zrealizowania. Tylko konkrety, ułożone od najwyższego priorytetu.*

- [ ] Funkcja Eksportu całej przestrzeni roboczej lub wybranych kart do PDF i Markdown.
- [ ] Zmiana przezroczystości dla konkretnych bloków / kart (szkło na kartach).
- [ ] Implementacja "rysowania swobodnego" / pisaka na tablicy.
- [ ] Rysowanie linii / połączeń pomiędzy konkretnymi kartami.
- [ ] Integracja z notatkami AI (podsumowanie całego widoku jednym kliknięciem).
- [ ] Tryb "Wskaźnika laserowego" lub podgląd żywych kursorów współpracowników (multiplayer).
- [ ] Auto-kontynuacja myślników: po "- treść" + enter nowa linijka też z myślnikiem (jak w edytorach).
- [ ] Responsywność: skalowanie narzędziowego paska (Flowbar) dla małych ekranów (mobile).
- [ ] Redesign System Menu: zmiana "Hamburgera" na 3 kropki (Kebab menu) i przeniesienie w prawy górny róg.
- [ ] Mobile: przytrzymanie palca na ekranie wyzwala możliwość wklejenia zawartości schowka (np. zrzutu ekranu).
  - **Plan Wdrożenia (Priorytet)**:
    - Ponieważ na PC wklejanie (Ctrl+V) zdjęć już działa natywnie (mamy nasłuchiwacz globalny w `app.js`), na mobile zastosujemy dedykowane rozwiązanie `Long Press`.
    - Po 600ms przytrzymaniu palca na Płótnie, wywołamy w miejscu palca **Podręczne Menu Kontekstowe**.
    - W menu będą opcje: "📸 Dodaj z Galerii" i "📋 Wklej ze Schowka".
    - Bezpośrednie kliknięcie na opcję wklejania sprawi, że wywołamy `navigator.clipboard.read()` w bezpiecznym, zaufanym dla Safari kontekście, co powinno odblokować wklejanie obrazów bezpośrednio na tablicę bez restrykcji systemowych.
- [ ] UI/UX: Dokończenie Flowbara na dole (ustalenie 5 kluczowych ikon zamiast 6, żeby wyglądało to symetrycznie i czysto).
- [ ] UX: Poprawa mechaniki "dodawania tekstu" na tablicę.
- [ ] Customizacja: Możliwość zmiany kolorów dla notatek, bloków i samego tekstu.
- [ ] Rich Text: Pływające menu formatowania tekstu (zmiana kolorów, nagłówki H1/H2, pogrubienie, kursywa itp.).
