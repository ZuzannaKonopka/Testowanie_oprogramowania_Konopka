# API i scenariusz demonstracyjny

## Główne endpointy

| Metoda | Ścieżka | Dostęp | Znaczenie |
|---|---|---|---|
| GET | `/api/health` | Publiczny | Status serwera |
| POST | `/api/auth/register` | Publiczny | Rejestracja |
| POST | `/api/auth/login` | Publiczny | Logowanie i sesja |
| POST | `/api/auth/logout` | Sesja opcjonalna | Unieważnienie sesji |
| GET | `/api/auth/me` | Publiczny | Aktualny użytkownik lub `null` |
| GET | `/api/lists` | Zalogowany | Listy dostępne dla użytkownika |
| POST | `/api/lists` | Zalogowany | Utworzenie listy |
| GET | `/api/lists/:id` | Właściciel/współdzielący | Szczegóły listy |
| PATCH | `/api/lists/:id` | Właściciel | Zmiana nazwy lub daty |
| DELETE | `/api/lists/:id` | Właściciel | Usunięcie listy |
| POST | `/api/lists/:id/items` | Właściciel | Dodanie produktu |
| PATCH | `/api/lists/:id/items/:itemId/toggle` | Właściciel/współdzielący | Zmiana statusu zakupienia |
| DELETE | `/api/lists/:id/items/:itemId` | Właściciel | Usunięcie produktu |
| POST | `/api/lists/:id/share` | Właściciel | Udostępnienie listy e-mailem |

Dla żądań z danymi należy ustawić `Content-Type: application/json`. Zalogowanie zwraca cookie sesyjne, które klient wysyła przy kolejnych żądaniach.

## Proponowana demonstracja na laboratorium

1. Uruchom aplikację i pokaż stronę główną.
2. Zarejestruj dwa konta w dwóch sesjach/przeglądarkach.
3. Na pierwszym koncie utwórz listę i dodaj dwa produkty.
4. Udostępnij listę adresowi e-mail drugiego konta.
5. Na drugim koncie odśwież listy i zmień status jednego produktu.
6. Pokaż, że osoba współdzieląca nie może dodawać ani usuwać produktów.
7. Wyloguj się i pokaż, że prywatne API bez sesji zwraca HTTP 401.
8. Uruchom `npm test`, `npm run test:coverage`, `npm run perf` i `npm run security:check`.
9. Omów wyniki z `docs/raport-z-testow.md` oraz uzupełnij raport OWASP ZAP po wykonaniu skanu.
