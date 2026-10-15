# TSMA Content Editor dashboard

Frontend route: `/editor` (requires a signed-in TSMA account).

The page uses the existing Django REST API and the permissions already enforced by the API. Modules included: News, Courses, Partners, Board members, and Conferences. File fields support image uploads where the API serializer accepts them.

## Setup
1. Copy `tsma-frontend/src/pages/EditorDashboard.jsx` and the updated `src/App.jsx` into the frontend repository, or use the supplied project ZIP.
2. Set `VITE_API_BASE_URL` to your deployed Django API base, e.g. `https://YOUR-BACKEND/api`.
3. Deploy frontend and visit `/editor` after logging in.
4. Ensure the logged-in user has the required Django role. The API will return 403 for modules outside the user's role; this is intentional security enforcement.

The dashboard does not include membership private data, payment management, or ticket payment actions. Keep Django Admin restricted to Super Admins as planned.
