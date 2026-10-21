# Raport z testów — Lista zakupów

**Wersja aplikacji:** 1.0.0  
**Data wykonania:** 2026-10-21  
**Środowisko:** Node.js 20+, system operacyjny i wersja Node.js do wpisania przed oddaniem.

## 1. Podsumowanie

Raport odzwierciedla wykonanie testów w lokalnym środowisku roboczym 2026-10-21. Wyniki mogą różnić się na innym komputerze. Pełny skan OWASP ZAP nie został wykonany w ramach tego przebiegu; nie jest oznaczony jako zaliczony.

## 2. Wyniki testów automatycznych

| Rodzaj | Polecenie | Wynik | Uwagi |
|---|---|---|---|
| Wszystkie testy automatyczne | `npm test` | **PASS — 16/16** | 16 zaliczonych, 0 niezaliczonych |
| Jednostkowe | `npm run test:unit` | Zawarte w `npm test` | 7 testów jednostkowych |
| Integracyjne | `npm run test:integration` | Zawarte w `npm test` | 3 scenariusze integracyjne |
| Systemowe | `npm run test:system` | Zawarte w `npm test` | 2 scenariusze systemowe |
| Bezpieczeństwa | `npm run test:security` | Zawarte w `npm test` | 4 testy bezpieczeństwa |
| Pokrycie kodu | `npm run test:coverage` | **PASS** | 96,28% linii, 80,10% gałęzi, 98,36% funkcji (raport Node.js obejmuje również kod testów) |

## 3. Testy wydajnościowe

Uruchomienie pomiaru: `USERS=5 REQUESTS_PER_USER=10 npm run perf` (50 żądań, 5 workerów). Domyślny profil skryptu to 10 workerów × 20 żądań.  
Plik wyniku: `performance/results-*.json`.  
Do raportu przepisać liczbę żądań, błędów, przepustowość, medianę, p95 i p99. Powtórzyć test co najmniej trzy razy na tym samym komputerze i opisać zmienność wyników.

| Uruchomienie | Żądania | Błędy | Żądania/s | Mediana (ms) | p95 (ms) | p99 (ms) |
|---|---:|---:|---:|---:|---:|---:|
| 1 (50 żądań, 5 workerów) | 50 | 0 | 960,72 | 3,57 | 12,50 | 18,03 |
| 2 | — | — | — | — | — | — |
| 3 | — | — | — | — | — | — |

## 4. Audyt bezpieczeństwa

Wynik `npm run security:check`: **PASS — 5/5 kontroli** (nagłówki bezpieczeństwa, wymaganie uwierzytelnienia, poprawna rejestracja, flagi cookie i walidacja danych). Pełny skan OWASP ZAP nie został wykonany. Przed oddaniem należy wykonać skan i załączyć raport HTML, jeśli jest wymagany przez prowadzącego. Dla każdego alertu opisać poziom ryzyka, dowód, wpływ, zalecenie i status poprawki.

| Znalezisko | Ryzyko | Dowód / artefakt | Zalecenie | Status |
|---|---|---|---|---|
| OWASP ZAP | Nie wykonano | Brak raportu ZAP w tym przebiegu | Uruchomić ZAP lokalnie i przeanalizować alerty | Do wykonania |

## 5. Wnioski i zalecenia

Wstępne wnioski na podstawie wykonanych testów: wszystkie 16 testów automatycznych przeszło; pięć podstawowych kontroli bezpieczeństwa przeszło; w pojedynczym pomiarze obciążeniowym 50 żądań zakończyło się bez błędów. Wynik wydajnościowy jest pomiarem lokalnym endpointu `/api/health`, a nie całej aplikacji. Do wykonania pozostaje pełny skan OWASP ZAP i co najmniej dwa dodatkowe pomiary wydajnościowe.

Po wykonaniu pozostałych testów uzupełnić:

1. Które wymagania zostały potwierdzone przez testy?
2. Czy pojawiły się błędy lub nieoczekiwane wyniki? Jakie?
3. Jakie są ograniczenia pomiarów wydajnościowych?
4. Jakie alerty wykrył OWASP ZAP i jak należy je naprawić?
5. Jakie poprawki powinny zostać wykonane przed wdrożeniem?

## 6. Artefakty

- Log z `npm test`.
- Raport z `npm run test:coverage`.
- JSON z testu wydajnościowego.
- Raport HTML OWASP ZAP, jeśli został faktycznie wygenerowany.
