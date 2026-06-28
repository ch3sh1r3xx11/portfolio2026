# Logi Sesji Programowania (Vibe Coding Sessions)

*Format wpisu: Data | Co zrobiono w kilku żołnierskich słowach.*

**2026-06-28 | Mobile Fixes & System Menu UI**
Złamaliśmy ostatecznie problem wylewających się, ogromnych zdjęć z iOS/Android pisając kompresor WEBP na poziomie przeglądarki (Canvas) przed wrzutką na serwer. Sticky notes otrzymały nowy, czarny wygląd bez promienia (border-radius: 0) i możliwość skalowania swobodnego dzięki `FlowImageManager`. Ożywiono boczny "Hamburger" menu, integrując w nim bezpieczne logowanie, suwak regulacji ciemnego "szkła" w tle (zapisujący na żywo stan w localStorage bez opóźnienia) oraz podpięto mu główną czcionkę systemową projektu. Utworzono fundamenty architektoniczne (katalog `/docs`).

**2026-06-28 (Noc) | Drawing Physics, Scaling & Bounding Boxes**
Ukończono integrację Pisaka z silnikiem tablicy. Wprowadzono system "Wirtualnego Kwadratu" (Bounding Boxa), który zamyka odręczne rysunki wektorowe w standardowe ramki kart (co pozwala na ich usuwanie i przeciąganie). Zaimplementowano ręczne, precyzyjne wyliczanie min/max współrzędnych ścieżki (zastępując problematyczne `getBBox()`). Odblokowano artystyczny hack skalowania grubości linii (usuwając `vector-effect` i zamrożenie proporcji). Wprowadzono `pointer-events: none` na całą ramkę wektora, pozostawiając samą linię pisaka "namacalną", co odblokowało uwięzione pod spodem notatki. Wygenerowano i zapisano plan wdrożenia wklejania ze schowka (Long Press) na iOS na kolejną sesję.
