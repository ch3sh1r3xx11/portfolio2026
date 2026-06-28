# Status Systemu (Now)

## Gdzie jesteśmy teraz? (Status)
Aplikacja została pomyślnie zdeployowana na Vercel i połączona z chmurą Firebase (Auth, Firestore, Storage). Główny silnik (Flow Motion) obsługuje nieskończone płótno z własną obsługą myszy, dotyku i skalowania. Zaimplementowano podstawowe bloki funkcjonalne oraz stworzono wersję testową aplikacji `/projektownik-test` z zaimportowanym z innego projektu animowanym tłem WebGL (Strands).

## Co działa świetnie?
- **Silnik Canvas**: Gładkie panoramowanie, poprawna matematyka matrycy przy przybliżaniu, blokowanie natywnego scrolla.
- **Kompresja Mobilna**: Zdjęcia z telefonu (w tym ciężkie HEIC z iOS) są w locie rysowane na ukrytym elemencie `<canvas>`, skalowane w dół i zapisywane jako ultralekkie WebP.
- **Interfejs Vibe / Glassmorphism**: Globalny `design-tokens.css` i dynamiczny suwak przezroczystości zapisujący stan do `localStorage`.
- **Wersja Testowa Strands (Desktop)**: Animowane, ciemne, falujące tło shaderowe zoptymalizowane pod parametry wizualne z kreatora (scale: 3, thickness: 0.9, opacity: 0.8) działa stabilnie na urządzeniach stacjonarnych.

## Co jest aktualnie zepsute?
- **Mobile WebGL Memory Crash**: Na urządzeniach mobilnych (iOS Safari) animowane tło Strands (WebGL) po chwili działania przepełnia pamięć GPU i powoduje restartowanie karty/crash przeglądarki Safari ("Wielokrotnie wystąpił problem...").

## Co następne w kolejce? (Next Action)
- Mobile WebGL: Optymalizacja tła (ograniczenie liczby fal, spadek pixelRatio do 1.0 dla mobile lub całkowite wyłączenie animacji w tle na urządzeniach przenośnych jako fallback).
- Mobile: Implementacja Long Press do wklejania obrazów bezpośrednio ze schowka (zgodnie z wygenerowanym planem wdrożenia).
- Weryfikacja działania i przechodzenia między różnymi Projektami (tablicami) poprzez opcję "Projekty" w System Menu.
- Połączenie mechanizmu eksportu dokumentacji do Markdown/PDF.
- Zmiana kolorów notatek, bloków i tekstu oraz menu formatowania tekstu.
