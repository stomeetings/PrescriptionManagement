// Mock data only - no backend Patient module exists yet. Shape mirrors what a real
// PatientSummaryResponse would plausibly look like, so swapping this for a real API
// call later doesn't require reshaping PatientSummaryTable.
export const MOCK_PATIENTS = [
  { patientId: 'PT-1001', fullName: 'Ayesha Khan', gender: 'Female', phone: '+92 300 1234567', status: 'Active' },
  { patientId: 'PT-1002', fullName: 'Bilal Ahmed', gender: 'Male', phone: '+92 301 2345678', status: 'Active' },
  { patientId: 'PT-1003', fullName: 'Sana Malik', gender: 'Female', phone: '+92 302 3456789', status: 'Inactive' },
  { patientId: 'PT-1004', fullName: 'Usman Tariq', gender: 'Male', phone: '+92 303 4567890', status: 'Active' },
  { patientId: 'PT-1005', fullName: 'Hina Sheikh', gender: 'Female', phone: '+92 304 5678901', status: 'Active' },
  { patientId: 'PT-1006', fullName: 'Farhan Qureshi', gender: 'Male', phone: '+92 305 6789012', status: 'Inactive' },
  { patientId: 'PT-1007', fullName: 'Mahnoor Iqbal', gender: 'Female', phone: '+92 306 7890123', status: 'Active' },
  { patientId: 'PT-1008', fullName: 'Zeeshan Raza', gender: 'Male', phone: '+92 307 8901234', status: 'Active' },
  { patientId: 'PT-1009', fullName: 'Komal Siddiqui', gender: 'Female', phone: '+92 308 9012345', status: 'Active' },
  { patientId: 'PT-1010', fullName: 'Imran Baig', gender: 'Male', phone: '+92 309 0123456', status: 'Inactive' },
  { patientId: 'PT-1011', fullName: 'Rabia Yousaf', gender: 'Female', phone: '+92 310 1234567', status: 'Active' },
  { patientId: 'PT-1012', fullName: 'Adnan Chaudhry', gender: 'Male', phone: '+92 311 2345678', status: 'Active' },
];
