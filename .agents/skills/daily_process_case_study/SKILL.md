---
name: daily_process_case_study
description: Przekształca surowe notatki z dnia pracy w ustrukturyzowany, profesjonalny raport (case study / playbook), gotowy do użycia w portfolio lub przy sprzedaży umiejętności jako AI-driven PM.
---

# Daily Process Case Study

Ten skill służy do generowania wysokiej jakości dokumentów podsumowujących sesje pracy. Użyj go, gdy użytkownik dostarczy "surowe notatki" oraz "kontekst" i poprosi o wygenerowanie case study lub raportu do portfolio.

## Zasady działania (Wymagania Jakości)
- **Język:** Po polsku, ultrakonkretny, bez lania wody. Zero motywacyjnego "bullshitu".
- **Ton:** "AI-driven PM" – analityczny, inżynieryjny, skupiony na rozwiązaniach i automatyzacji.
- **Format:** Czysty Markdown (nadający się do natychmiastowego eksportu do PDF o długości maks. 2 stron A4). Tylko proces, dowody, efekty, nauka i zastosowanie biznesowe.

## Wejście (Oczekiwane od Użytkownika)
Zanim wygenerujesz raport, musisz posiadać:
1. Surowe notatki z dnia (markdown, zrzut tekstu z Projektownika, logi pracy z AI).
2. Krótki opis kontekstu (np. "praca nad aplikacją", "iteracja portfolio v0.3 -> v0.4").

Jeśli brakuje któregoś z elementów, poproś o jego uzupełnienie.

## Struktura Wyjściowa (Gotowy Raport)

> **CRITICAL RULE:** Cały ostateczny raport (czyli wszystko od "Context & Goal" aż po koniec) musi być otoczony jednym, wielkim blokiem kodu Markdown (tj. ` ```markdown ` na początku i ` ``` ` na końcu). Wynika to z faktu, że użytkownik kopiuje cały ten raport do systemu jednym przyciskiem. Nic nie może znajdować się poza tym blokiem kodu.

Wygeneruj dokument ściśle według poniższej struktury:

### Context & Goal (3–5 zdań)
Zdefiniuj, co to był za dzień, nad czym pracowano i jaki był ostateczny cel (np. rozwiązanie konkretnego problemu architektonicznego, wdrożenie nowej funkcji z pomocą AI).

### Rapid Development Process
Opisz krok po kroku iterację, kładąc szczególny nacisk na:
- Jak wykorzystano AI (research, kodowanie, generowanie treści).
- Jak przebiegało testowanie "w locie" na własnej skórze (dogfooding).
- Pętlę wytwórczą: *pomysł → implementacja → test → poprawka*.

### Artifacts (Evidence)
Krótka lista twardych dowodów potwierdzających wykonaną pracę:
- Linki (strony docelowe, repozytoria, Figma).
- Zrzuty ekranu (zaproponuj konkretne opisy lub nazwy plików, np. `[screenshot_debug_console.png]`).
- Wygenerowane pliki (np. stworzone prompty, skille, fragmenty architektury).

### Reusable Process (Playbook) (3–7 punktów)
Zestawienie wypracowanego procesu w ujęciu uniwersalnym (do wdrożenia u klienta/pracodawcy). Unikaj technicznego żargonu projektu. Przykładowo: 
- Krok 1: Mapowanie problemu na wirtualnej tablicy.
- Krok 2: Konfiguracja AI jako Junior Developera.
- Krok 3: Pętla debugowania na żywo z użyciem narzędzi diagnostycznych.

### Lessons Learned (3–5 punktów)
Konkretna wiedza nabyta podczas iteracji w trzech wymiarach:
- Technicznym (np. specyfika zachowania przeglądarki podczas drag&drop).
- Produktowym (np. konieczność minimalizowania tarcia podczas zbierania myśli - inbox).
- PM-owym (Zarządzanie czasem, priorytetyzacja AI, sterowanie procesem asystenta).

### How To Sell This (3–5 punktów)
Jak zmonetyzować wypracowaną wiedzę. Wylistuj:
- Jak zaprezentować dzisiejszy dzień jako konkretny business case na rozmowie o pracę.
- Jak opakować ten proces w ofertę side hustle / freelancingu (np. "Ustawiam zwinne workflow Rapid Development oparte o AI dla małych zespołów").
