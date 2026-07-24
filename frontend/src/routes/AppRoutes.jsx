import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/Login/LoginPage.jsx';
import DashboardPage from '../pages/Dashboard/DashboardPage.jsx';
import AccessDeniedPage from '../pages/AccessDenied/AccessDeniedPage.jsx';
import ComingSoonPage from '../pages/ComingSoon/ComingSoonPage.jsx';
import UserListPage from '../pages/UserManagement/UserListPage.jsx';
import CreateUserPage from '../pages/UserManagement/CreateUserPage.jsx';
import EditUserPage from '../pages/UserManagement/EditUserPage.jsx';
import UserDetailsPage from '../pages/UserManagement/UserDetailsPage.jsx';
import PatientListPage from '../pages/PatientManagement/PatientListPage.jsx';
import CreatePatientPage from '../pages/PatientManagement/CreatePatientPage.jsx';
import EditPatientPage from '../pages/PatientManagement/EditPatientPage.jsx';
import PatientDetailsPage from '../pages/PatientManagement/PatientDetailsPage.jsx';
import AddPatientMedicationPage from '../pages/PatientManagement/AddPatientMedicationPage.jsx';
import EditPatientMedicationPage from '../pages/PatientManagement/EditPatientMedicationPage.jsx';
import PatientMedicationDetailsPage from '../pages/PatientManagement/PatientMedicationDetailsPage.jsx';
import PrescriptionListPage from '../pages/PrescriptionManagement/PrescriptionListPage.jsx';
import PrescriptionDetailsPage from '../pages/PrescriptionManagement/PrescriptionDetailsPage.jsx';
import MedicineListPage from '../pages/MedicineManagement/MedicineListPage.jsx';
import CreateMedicinePage from '../pages/MedicineManagement/CreateMedicinePage.jsx';
import EditMedicinePage from '../pages/MedicineManagement/EditMedicinePage.jsx';
import MedicineDetailsPage from '../pages/MedicineManagement/MedicineDetailsPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import RequireRole from './RequireRole.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import { ROLES } from '../auth/roles.js';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientListPage />} />

          {/* View is open to any authenticated role (Administrator/Doctor/Receptionist/
              Pharmacist) - matches PatientsController's class-level [Authorize] with no
              Roles restriction on GetById. Must be registered after /patients/create so
              that literal path takes precedence over this :patientId param route. */}
          <Route path="/patients/:patientId" element={<PatientDetailsPage />} />

          {/* Administrator/Doctor/Receptionist only - matches PatientsController's
              [Authorize(Roles = "SYSTEM_ADMINISTRATOR,DOCTOR,RECEPTIONIST")] on
              Create/Update (api-spec.md section 3). Pharmacists have View only. */}
          <Route element={<RequireRole allowedRoles={[ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR, ROLES.RECEPTIONIST]} />}>
            <Route path="/patients/create" element={<CreatePatientPage />} />
            <Route path="/patients/:patientId/edit" element={<EditPatientPage />} />
          </Route>

          {/* Patient Medication write access is Administrator/Doctor only (api-spec.md
              section 3 - PatientMedicationsController's FullAccessRoles), a narrower
              tier than Patient Management's own Admin/Doctor/Receptionist above -
              Receptionist has View only for Patient Medications. */}
          <Route element={<RequireRole allowedRoles={[ROLES.SYSTEM_ADMINISTRATOR, ROLES.DOCTOR]} />}>
            <Route path="/patients/:patientId/medications/add" element={<AddPatientMedicationPage />} />
            <Route
              path="/patients/:patientId/medications/:patientMedicationId/edit"
              element={<EditPatientMedicationPage />}
            />
          </Route>

          {/* View is open to any authenticated role - matches PatientMedicationsController's
              GetById (no Roles restriction, api-spec.md section 3/4.2). Registered after
              the /add and /edit routes above so those literal suffixes take precedence
              over this bare :patientMedicationId param route. */}
          <Route
            path="/patients/:patientId/medications/:patientMedicationId"
            element={<PatientMedicationDetailsPage />}
          />

          <Route path="/prescriptions" element={<PrescriptionListPage />} />

          {/* View is open to any authenticated role - matches PrescriptionsController's
              GetDetails (no Roles restriction on the class-level [Authorize]). "All
              users should navigate here before performing any action" (Prescription
              Details' own framing). */}
          <Route path="/prescriptions/:prescriptionId" element={<PrescriptionDetailsPage />} />
          <Route path="/medicines" element={<MedicineListPage />} />

          {/* View is open to any authenticated role - matches MedicinesController's
              class-level [Authorize] with no Roles restriction on GetById. */}
          <Route path="/medicines/:medicineId" element={<MedicineDetailsPage />} />
          <Route path="/access-denied" element={<AccessDeniedPage />} />

          {/* Administrator-only: matches the sidebar's adminOnly items, the backend's
              actual role restrictions on these controllers, and MedicinesController's
              [Authorize(Roles = "SYSTEM_ADMINISTRATOR")] on Create/Update/Activate/
              Deactivate (Medicine Management has a single write tier - no Doctor/
              Receptionist write access, unlike Patient Management). */}
          <Route element={<RequireRole allowedRoles={[ROLES.SYSTEM_ADMINISTRATOR]} />}>
            <Route path="/medicines/create" element={<CreateMedicinePage />} />
            <Route path="/medicines/:medicineId/edit" element={<EditMedicinePage />} />
            <Route path="/lookup-management" element={<ComingSoonPage title="Lookup Management" />} />
            <Route path="/user-management" element={<UserListPage />} />
            <Route path="/user-management/create" element={<CreateUserPage />} />
            <Route path="/user-management/:userAccountId/edit" element={<EditUserPage />} />
            <Route path="/user-management/:userAccountId" element={<UserDetailsPage />} />
            <Route path="/settings" element={<ComingSoonPage title="Settings" />} />
          </Route>

          <Route path="/reports" element={<ComingSoonPage title="Reports" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
