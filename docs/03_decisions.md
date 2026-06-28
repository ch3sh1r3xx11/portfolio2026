# Rejestr Decyzji Architektonicznych (ADR / Decisions)

## ADR 001: Firebase Realtime jako jedyne źródło prawdy
- **Kontekst:** Tablica musi umożliwiać płynny zapis setek modyfikacji bez zapychania przeglądarki oknami "Czy na pewno chcesz zapisać?".
- **Decyzja:** Zamiast wysyłać grube pakiety danych przy kliknięciu "Zapisz", każdy ruch karty czy zmiana jej rozmiaru natychmiast uderza bezpośrednio w Firebase Firestore do kolekcji `notes`.
- **Konsekwencje:** Brak "niezapisanego stanu". Przycisk "Zapisz" to tylko wizualny środek uspokajający dla użytkownika.

## ADR 002: Vanilla JS + Custom Web Components
- **Kontekst:** Reaktywne frameworki (jak React) narzucają duży overhead na operacje w drzewie DOM, zwłaszcza przy ciągłym rysowaniu na obiekcie o wymiarach 10000x10000px.
- **Decyzja:** Główny silnik Projektownika jest czystym Vanilla Javascript, bezpośrednio modyfikującym style `translate` za pomocą `requestAnimationFrame`. Elementy menu (np. Flowbar, SystemMenu) zamknięto w lekkie Custom Elements (`<shared-flowbar>`).
- **Konsekwencje:** Ekstremalnie wysoka wydajność i natywne wsparcie przeglądarki, kosztem ręcznego zarządzania nasłuchiwaczami zdarzeń (Event Listeners).

## ADR 003: Client-side WEBP Image Compression
- **Kontekst:** Zdjęcia dodawane z urządzeń mobilnych (iOS HEIC, kamery 48MP) powodowały martwe linki i przeciążały bazę Storage wielkimi plikami.
- **Decyzja:** Zaimplementowano ukryty, lokalny kompresor `<canvas>`, który po wybraniu zdjęcia sprzętowo pomniejsza go do max 1920px i konwertuje na format `.webp` na urządzeniu, zanim nastąpi właściwy upload do chmury.
- **Konsekwencje:** Błyskawiczny czas uploadu, pełna kompatybilność, 10x mniejsze zużycie przestrzeni Firebase.

## ADR 004: Własny mechanizm skalowania (FlowImageManager)
- **Kontekst:** Wbudowany w przeglądarkę atrybut `resize: both` był trudny do ostylowania (szary, obskurny trójkącik w rogu) i rzucał dziwne errory przy tablicach używających macierzy transformacji `scale()`.
- **Decyzja:** Napisano własny menedżer skalowania po krawędziach i rogach z wymuszaniem proporcji obrazka (lub bez, dla bloków Sticky Notes), który na `pointerup` wysyła finalne dane wprost do Historii (Undo/Redo).

## ADR 005: Ręcznie wyliczany Bounding Box i fizyka duchów (Pointer Events) w rysunkach
- **Kontekst:** Przeglądarkowy silnik SVG `getBBox()` generował błędy wykonania i zwracał niepoprawne, minimalne wymiary dla szybkich szkiców (zwłaszcza na mobile), powodując rozrzucenie linii w nieskończoność. Ponadto, wirtualny kwadrat rysunku (karta) jako element blokujący (pointer-events: auto) uniemożliwiał kliknięcie i edycję tradycyjnych notatek znajdujących się fizycznie pod nim.
- **Decyzja:** Zaimplementowano natywny algorytm iterujący po tablicy współrzędnych punktów rysunku w celu znalezienia skrajnych granic min/max (X i Y). Zmieniono style w `style.css`: karta rysunku otrzymała `pointer-events: none`, a pojedyncza ścieżka wektora `pointer-events: visibleStroke`, co uczyniło pustą ramkę klikalną na wylot.
- **Konsekwencje:** 100% stabilność matematyczna bez asynchronicznych problemów z reflow przeglądarki. Możliwość bezproblemowej edycji kart leżących pod odręcznymi rysunkami oraz precyzyjnego przeciągania wektorów za samą narysowaną linię.

## ADR 006: Metodologia Prototypowania (Izolowane środowiska)
- **Kontekst:** Testowanie zaawansowanych mechanik (np. fizyka, systemy orbit, układy binarne) w głównym pliku `app.js` zużywa zbyt dużo tokenów kontekstu (LLM) i grozi uszkodzeniem stabilnej aplikacji.
- **Decyzja:** Złożone moduły są najpierw tworzone w oddzielnych, izolowanych folderach prototypowych (np. `apps/orbit-prototype`). Po zbadaniu mechaniki, kodu i wydajności w izolacji, gotowy moduł jest portowany do głównego środowiska.
- **Konsekwencje:** Budowanie specjalistycznej wiedzy (Specific Knowledge) krok po kroku, mniejsze zużycie limitów AI oraz stuprocentowe bezpieczeństwo głównego repozytorium.

## ADR 007: "Make it work, make it right, make it beautiful" (Solid Colors First)
- **Kontekst:** Skupienie się na estetyce (szkło, przezroczystości, cienie) w fazie wczesnego prototypowania zaciemnia błędy w logice matematycznej i przepływie danych.
- **Decyzja:** Podczas wdrażania nowej architektury UI/UX używamy na start ostrych, litych kolorów (Solid Colors) bez efektów specjalnych. W pierwszej kolejności weryfikowana jest mechanika. Po jej zatwierdzeniu nakładana jest warstwa "Vibe Codingu" i Glassmorphismu.
- **Konsekwencje:** Szybsze prototypowanie, mniej problemów z wydajnością na etapie testów (render pipeline przeglądarki) i wyraźnie rozdzielony proces inżynieryjny od artystycznego.

## Podejście Agile

Priorytetyzujemy kompromisy pomiędzy szybkością renderowania a stopniem skomplikowania kodu (np. używanie wirtualnych kwadratów/Bounding Boxów dla wektorów SVG zamiast precyzyjnych obliczeń wielokątów). Zawsze wybieramy najszybszą, najbardziej stabilną i zoptymalizowaną ścieżkę dla silnika.
