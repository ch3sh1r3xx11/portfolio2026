# Rejestr Decyzji Architektonicznych (ADR / Decisions)

## ADR 001: Firebase Realtime jako jedyne źródło prawdy
- **Kontekst:** Tablica musi umożliwiać płynny zapis setek modyfikacji bez zapychania przeglądarki oknami "Czy na pewno chcesz zapisać?".
- **Decyzja:** Zamiast wysyłać grube pakiety danych przy kliknięciu "Zapisz", każdy ruch karty czy zmiana jej rozmiaru natychmiast uderza bezpośrednio w Firebase Firestore do kolekcji `notes`.
- **Konsekwencje:** Brak "niezapisanego stanu". Przycisk "Zapisz" to tylko wizualny środek uspokajający dla użytkownika.

## ADR 002: Vanilla JS + Custom Web Components
- **Kontekst:** Reaktywne frameworki (jak React) narzucają duży "narzut" (overhead) na operacje w drzewie DOM, zwłaszcza przy ciągłym rysowaniu na obiekcie o wymiarach 10000x10000px.
- **Decyzja:** Główny silnik Projektownika jest czystym Vanilla Javascript, bezpośrednio modyfikującym style `translate` za pomocą `requestAnimationFrame`. Elementy menu (np. Flowbar, SystemMenu) zamknięto w lekkie Custom Elements (`<shared-flowbar>`).
- **Konsekwencje:** Ekstremalnie wysoka wydajność i natywne wsparcie przeglądarki, kosztem ręcznego zarządzania nasłuchiwaczami zdarzeń (Event Listeners).

## ADR 003: Client-side WEBP Image Compression
- **Kontekst:** Zdjęcia dodawane z urządzeń mobilnych (iOS HEIC, kamery 48MP) powodowały martwe linki i przeciążały bazę Storage wielkimi plikami.
- **Decyzja:** Zaimplementowano ukryty, lokalny kompresor `<canvas>`, który po wybraniu zdjęcia sprzętowo pomniejsza go do max 1920px i konwertuje na format `.webp` na urządzeniu, zanim nastąpi właściwy upload do chmury.
- **Konsekwencje:** Błyskawiczny czas uploadu, pełna kompatybilność, 10x mniejsze zużycie przestrzeni Firebase.

## ADR 004: Własny mechanizm skalowania (FlowImageManager)
- **Kontekst:** Wbudowany w przeglądarkę atrybut `resize: both` był trudny do ostylowania (szary, obskurny trójkącik w rogu) i rzucał dziwne errory przy tablicach używających macierzy transformacji `scale()`.
- **Decyzja:** Napisano własny menedżer skalowania po krawędziach i rogach z wymuszaniem proporcji obrazka (lub bez, dla bloków Sticky Notes), który na `pointerup` wysyła finalne dane wprost do Historii (Undo/Redo).
