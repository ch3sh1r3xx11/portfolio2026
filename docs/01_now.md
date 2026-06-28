# Status Systemu (Now)

## Gdzie jesteśmy teraz? (Status)
Aplikacja została pomyślnie zdeployowana na Vercel i połączona z chmurą Firebase (Auth, Firestore, Storage). Główny silnik (Flow Motion) obsługuje nieskończone płótno z własną obsługą myszy, dotyku i skalowania. Zaimplementowano podstawowe bloki funkcjonalne:
- Edytor Markdown z podświetlaniem składni (Karty)
- Sticky Notes (czarne, kwadratowe karty samoprzylepne)
- Menedżer Zdjć (obsługujący przeciągnij-i-upuść oraz kompresję)
- System historii operacji (Undo/Redo zrealizowane przez wzorzec Command)
- Menu Techniczne (lewy boczny hamburger) do kontroli środowiska

## Co działa świetnie?
- **Silnik Canvas**: Gładkie panoramowanie, poprawna matematyka matrycy przy przybliżaniu, blokowanie natywnego scrolla.
- **Kompresja Mobilna**: Zdjęcia z telefonu (w tym ciężkie HEIC z iOS) są w locie rysowane na ukrytym elemencie `<canvas>`, skalowane w dół i zapisywane jako ultralekkie WebP, co oszczędza przestrzeń Firebase i czas ładowania.
- **System Zmiany Rozmiaru (FlowImageManager)**: Autorski mechanizm skalowania oparty o rogi elementu, pomijający natywne, ograniczone `resize: both` przeglądarki. Połączony z systemem zapisu historii cofania.
- **Interfejs Vibe / Glassmorphism**: Globalny `design-tokens.css`, czcionka JetBrains Mono i dynamiczny suwak przezroczystości zapisujący stan do `localStorage`.
- **Narzędzie Pisaka (Wirtualny Kwadrat)**: Rysunki odręczne są konwertowane na stabilne wektory otoczone Bounding Boxem (Wirtualną Kartą). Wspierają proporcjonalne i nieproporcjonalne skalowanie (hack grubości linii) oraz usuwanie. W pełni przezroczyste tło (click-through) pozwala klikać elementy pod rysunkami.

## Co jest aktualnie zepsute?
- Brak znanych błędów krytycznych. System automatycznego detekowania wielkości wektorów SVG został zastąpiony niezawodną matematyką współrzędnych.

## Co następne w kolejce? (Next Action)
- Mobile: Implementacja Long Press do wklejania obrazów bezpośrednio ze schowka (zgodnie z wygenerowanym planem wdrożenia).
- Weryfikacja działania i przechodzenia między różnymi Projektami (tablicami) poprzez opcję "Projekty" w System Menu.
- Połączenie mechanizmu eksportu dokumentacji do Markdown/PDF.
- Zmiana kolorów notatek, bloków i tekstu oraz menu formatowania tekstu.
