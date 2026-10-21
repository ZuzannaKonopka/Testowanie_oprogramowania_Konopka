# Przypadki testowe — Lista zakupów

**Wersja:** 1.0.0  
**Autor:** Zuzanna Konopka

## TC.1.1 — Rejestracja poprawnego użytkownika

**Warunki początkowe:** serwer działa; adres e-mail nie jest jeszcze zarejestrowany.  
**Podsumowanie:** weryfikacja utworzenia konta z poprawnymi danymi.

**Kroki:**
1. Wyślij `POST /api/auth/register` z poprawnym adresem e-mail i hasłem długości co najmniej 10 znaków.
2. Sprawdź kod HTTP i zwrócony obiekt użytkownika.

| ID danych | Dane testowe | Oczekiwany rezultat |
|---|---|---|
| TC.1.1.1 | Poprawny e-mail, hasło 10+ znaków | HTTP 201; odpowiedź zawiera ID i e-mail, nie zawiera hasła ani skrótu hasła |
| TC.1.1.2 | Niepoprawny e-mail | HTTP 400 |
| TC.1.1.3 | Hasło krótsze niż 10 znaków | HTTP 400 |
| TC.1.1.4 | E-mail już zarejestrowany | HTTP 409 |

## TC.1.2 — Logowanie i wylogowanie

**Warunki początkowe:** istnieje konto testowe.  
**Podsumowanie:** sprawdzenie ustanawiania i unieważniania sesji.

**Kroki:** zaloguj się; odczytaj `Set-Cookie`; pobierz `/api/lists`; wyloguj się; ponownie pobierz `/api/lists`.

| ID danych | Dane testowe | Oczekiwany rezultat |
|---|---|---|
| TC.1.2.1 | Poprawny e-mail i hasło | HTTP 200, cookie z `HttpOnly` i `SameSite=Strict` |
| TC.1.2.2 | Poprawny e-mail, błędne hasło | HTTP 401, komunikat ogólny |
| TC.1.2.3 | Brak cookie przy dostępie do list | HTTP 401 |
| TC.1.2.4 | Sesja po wylogowaniu | HTTP 401 przy kolejnym dostępie do API |

## TC.1.3 — Zarządzanie listą i pozycjami

**Warunki początkowe:** użytkownik jest zalogowany.  
**Podsumowanie:** sprawdzenie CRUD list i obsługi produktów.

**Kroki:** utwórz listę; dodaj produkt; pobierz listę; zmień status produktu; usuń produkt; usuń listę.

| ID danych | Dane testowe | Oczekiwany rezultat |
|---|---|---|
| TC.1.3.1 | Nazwa listy „Zakupy”, data `2026-11-01` | HTTP 201; lista zawiera podane dane |
| TC.1.3.2 | Produkt „Mleko”, ilość 2, jednostka `l` | HTTP 201; produkt zapisany na liście |
| TC.1.3.3 | Ilość 0 lub nazwa pusta | HTTP 400; pozycja nie zostaje dodana |
| TC.1.3.4 | Usunięcie istniejącego produktu | HTTP 204 |
| TC.1.3.5 | Usunięcie listy przez właściciela | HTTP 204 |

## TC.1.4 — Współdzielenie listy

**Warunki początkowe:** istnieją dwa konta; właściciel ma listę z co najmniej jedną pozycją.  
**Podsumowanie:** sprawdzenie ograniczonych uprawnień osoby współdzielącej.

| ID danych | Dane testowe | Oczekiwany rezultat |
|---|---|---|
| TC.1.4.1 | Właściciel udostępnia listę istniejącemu użytkownikowi | HTTP 200; użytkownik widzi listę |
| TC.1.4.2 | Współdzielący zmienia status produktu | HTTP 200; status zmienia się |
| TC.1.4.3 | Współdzielący dodaje produkt | HTTP 403 |
| TC.1.4.4 | Współdzielący usuwa produkt | HTTP 403 |
| TC.1.4.5 | Niepowiązany użytkownik odczytuje listę po ID | HTTP 404 |

## TC.1.5 — Nagłówki i walidacja bezpieczeństwa

**Warunki początkowe:** serwer działa lokalnie.  
**Podsumowanie:** weryfikacja podstawowych zabezpieczeń aplikacji.

| ID danych | Dane testowe | Oczekiwany rezultat |
|---|---|---|
| TC.1.5.1 | Żądanie `/api/health` | Obecne nagłówki CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| TC.1.5.2 | Niepoprawny typ treści dla JSON | HTTP 415 |
| TC.1.5.3 | Niepoprawna rejestracja | HTTP 400 |
| TC.1.5.4 | Brak uwierzytelnienia przy `/api/lists` | HTTP 401 |

## TC.1.6 — Test wydajnościowy

**Warunki początkowe:** lokalny serwer testowy jest uruchomiony, a inne obciążenia ograniczone.  
**Podsumowanie:** obserwacja czasu odpowiedzi i przepustowości endpointu health.

**Procedura:** wykonaj `USERS=10 REQUESTS_PER_USER=20 npm run perf`; zapisz plik JSON; powtórz trzykrotnie w tych samych warunkach.

**Oczekiwany rezultat:** skrypt raportuje liczbę żądań, błędy, przepustowość i percentyle czasu odpowiedzi. Dla testu bazowego oczekuje się braku błędów, a rzeczywiste wartości czasów należy wpisać do raportu po wykonaniu.
