// TMC-Care mock data layer
// All data here is fabricated for front-end demonstration purposes only.

export const currentUser = {
  id: 'ADM-001',
  name: 'Admin User',
  role: 'Super Administrator',
  email: 'admin@tmc.edu.ph',
  avatarColor: '#2F6FED',
};

export const departments = [
  { id: 'D-01', name: 'Office of Student Affairs', head: 'Dr. Ramon Villareal', staff: 6, description: 'Oversees student welfare, discipline, and incident resolution.' },
  { id: 'D-02', name: 'Guidance & Counseling', head: 'Ms. Ivy Tan-Ocampo', staff: 4, description: 'Handles counseling referrals and psychosocial support cases.' },
  { id: 'D-03', name: 'Finance & Scholarship Office', head: 'Mr. Edgar Malabanan', staff: 5, description: 'Reviews and releases financial assistance requests.' },
  { id: 'D-04', name: 'Campus Security', head: 'SO1 Bartolome Reyes', staff: 8, description: 'First responders for on-campus incidents and safety concerns.' },
  { id: 'D-05', name: 'Registrar\u2019s Office', head: 'Mrs. Corazon Fajardo', staff: 3, description: 'Verifies enrollment status supporting requests.' },
];

export const roles = [
  {
    id: 'R-01', name: 'Super Administrator', users: 2,
    description: 'Full system access including settings, roles, and audit logs.',
    permissions: ['View Dashboard', 'Manage Reports', 'Manage Requests', 'Manage Users', 'Manage Verifications', 'Send Communications', 'Manage System Settings', 'View Audit Logs'],
  },
  {
    id: 'R-02', name: 'Case Officer', users: 6,
    description: 'Reviews and processes incident reports and financial requests.',
    permissions: ['View Dashboard', 'Manage Reports', 'Manage Requests', 'Manage Verifications'],
  },
  {
    id: 'R-03', name: 'Finance Reviewer', users: 4,
    description: 'Verifies documents and releases approved financial assistance.',
    permissions: ['View Dashboard', 'Manage Verifications', 'Manage Requests (Financial)'],
  },
  {
    id: 'R-04', name: 'Front Desk / Encoder', users: 5,
    description: 'Encodes new reports and requests submitted in person.',
    permissions: ['View Dashboard', 'Create Reports', 'Create Requests'],
  },
  {
    id: 'R-05', name: 'Student', users: 3120,
    description: 'Can submit incident reports and financial assistance requests.',
    permissions: ['Submit Report', 'Submit Request', 'Track Own Requests'],
  },
];

const programs = ['BS Information Technology', 'BS Criminology', 'BS Elem. Education', 'BS Accountancy', 'BS Hospitality Mgmt', 'BS Nursing', 'BS Civil Engineering', 'BS Psychology'];
const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
const firstNames = ['Juan', 'Maria', 'Pedro', 'Ana', 'Jose', 'Rosa', 'Carlos', 'Liza', 'Mark', 'Grace', 'Paolo', 'Kristine', 'Ramon', 'Bea', 'Miguel', 'Angela', 'Noel', 'Charmaine', 'Ferdinand', 'Joy'];
const lastNames = ['Dela Cruz', 'Santos', 'Reyes', 'Garcia', 'Ramos', 'Mendoza', 'Torres', 'Flores', 'Villanueva', 'Bautista', 'Aquino', 'Castillo', 'Rivera', 'Gonzales', 'Cruz'];

function seededPick(arr, seed) {
  return arr[seed % arr.length];
}

export const students = Array.from({ length: 40 }).map((_, i) => {
  const first = seededPick(firstNames, i);
  const last = seededPick(lastNames, i * 3 + 1);
  return {
    id: `2021-${(10234 + i).toString()}`,
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase().replace(' ', '')}@students.tmc.edu.ph`,
    program: seededPick(programs, i * 2),
    year: seededPick(yearLevels, i),
    status: i % 13 === 0 ? 'Inactive' : 'Active',
    dateJoined: `2021-0${(i % 8) + 1}-15`,
    phone: `09${(170000000 + i * 12345).toString().slice(0, 9)}`,
  };
});

export const adminUsers = [
  { id: 'ADM-001', name: 'Admin User', email: 'admin@tmc.edu.ph', role: 'Super Administrator', department: 'Office of Student Affairs', status: 'Active', lastActive: '2 minutes ago' },
  { id: 'ADM-002', name: 'Ivy Tan-Ocampo', email: 'ivy.tanocampo@tmc.edu.ph', role: 'Case Officer', department: 'Guidance & Counseling', status: 'Active', lastActive: '18 minutes ago' },
  { id: 'ADM-003', name: 'Edgar Malabanan', email: 'edgar.malabanan@tmc.edu.ph', role: 'Finance Reviewer', department: 'Finance & Scholarship Office', status: 'Active', lastActive: '1 hour ago' },
  { id: 'ADM-004', name: 'Bartolome Reyes', email: 'bartolome.reyes@tmc.edu.ph', role: 'Case Officer', department: 'Campus Security', status: 'Active', lastActive: '3 hours ago' },
  { id: 'ADM-005', name: 'Corazon Fajardo', email: 'corazon.fajardo@tmc.edu.ph', role: 'Front Desk / Encoder', department: 'Registrar\u2019s Office', status: 'Inactive', lastActive: '2 days ago' },
  { id: 'ADM-006', name: 'Noel Villafuerte', email: 'noel.villafuerte@tmc.edu.ph', role: 'Finance Reviewer', department: 'Finance & Scholarship Office', status: 'Active', lastActive: '5 hours ago' },
  { id: 'ADM-007', name: 'Charmaine Ubaldo', email: 'charmaine.ubaldo@tmc.edu.ph', role: 'Front Desk / Encoder', department: 'Office of Student Affairs', status: 'Active', lastActive: '25 minutes ago' },
];

const incidentTypes = ['Bullying / Harassment', 'Property Damage', 'Theft', 'Physical Altercation', 'Vandalism', 'Health Emergency', 'Verbal Abuse', 'Cyberbullying', 'Lost Item'];
const incidentLocations = ['Main Building, 2nd Floor', 'Gymnasium', 'Canteen', 'Parking Area', 'Library', 'Computer Laboratory', 'Student Center', 'Science Building', 'Field / Grounds'];
const incidentStatuses = ['Submitted', 'Under Review', 'Investigating', 'Resolved', 'Dismissed'];

export const incidentReports = Array.from({ length: 34 }).map((_, i) => {
  const student = students[i % students.length];
  const status = seededPick(incidentStatuses, i);
  const isAnon = i % 7 === 0;
  return {
    id: `IR-2024-${(76 - i).toString().padStart(4, '0')}`,
    type: seededPick(incidentTypes, i),
    reportedBy: isAnon ? 'Anonymous' : student.name,
    studentId: isAnon ? null : student.id,
    location: seededPick(incidentLocations, i * 2 + 1),
    dateSubmitted: `2024-05-${((i % 27) + 1).toString().padStart(2, '0')}`,
    status,
    priority: seededPick(['Low', 'Medium', 'High', 'Critical'], i * 3),
    assignedTo: status === 'Submitted' ? 'Unassigned' : seededPick(['Bartolome Reyes', 'Ivy Tan-Ocampo', 'Admin User'], i),
    description: 'Student-submitted account of the incident describing what happened, who was involved, and any immediate concerns raised at the time of the report.',
  };
});

const assistanceTypes = ['Hospital / Medical Bills', 'Medicine Expenses', 'Transportation', 'Food & Daily Needs', 'School-related Expenses', 'Other Expenses'];
const financialStatuses = ['Submitted', 'Under Verification', 'Additional Documents', 'Approved', 'Partially Approved', 'Declined', 'Assistance Released'];

export const financialRequests = Array.from({ length: 52 }).map((_, i) => {
  const student = students[(i * 3) % students.length];
  const status = seededPick(financialStatuses, i);
  const amountRequested = [1500, 2500, 3000, 4200, 5000, 6800, 8000, 10000][i % 8];
  return {
    id: `FR-2024-${(52 - i).toString().padStart(4, '0')}`,
    student: student.name,
    studentId: student.id,
    program: student.program,
    type: seededPick(assistanceTypes, i),
    amountRequested,
    amountApproved: ['Approved', 'Partially Approved', 'Assistance Released'].includes(status)
      ? (status === 'Partially Approved' ? Math.round(amountRequested * 0.6) : amountRequested)
      : null,
    dateSubmitted: `2024-05-${((i % 27) + 1).toString().padStart(2, '0')}`,
    status,
    reason: 'Request submitted with supporting documentation citing financial hardship affecting continued enrollment or wellbeing.',
    documents: ['Certificate of Indigency.pdf', 'Enrollment Verification.pdf'].slice(0, (i % 2) + 1),
  };
});

export const pendingVerifications = [
  { id: 'FR-2024-0052', type: 'Financial', requestedBy: 'Juan Dela Cruz', dateSubmitted: 'May 26, 2024', status: 'Pending', documents: ['Certificate of Indigency.pdf', 'Hospital Bill.pdf'] },
  { id: 'FR-2024-0051', type: 'Financial', requestedBy: 'Maria Santos', dateSubmitted: 'May 25, 2024', status: 'Pending', documents: ['Enrollment Verification.pdf'] },
  { id: 'IR-2024-0076', type: 'Incident', requestedBy: 'Anonymous', dateSubmitted: 'May 25, 2024', status: 'Pending', documents: ['Photo Evidence.jpg'] },
  { id: 'FR-2024-0050', type: 'Financial', requestedBy: 'Pedro Reyes', dateSubmitted: 'May 24, 2024', status: 'Pending', documents: ['Certificate of Indigency.pdf'] },
  { id: 'FR-2024-0049', type: 'Financial', requestedBy: 'Ana Garcia', dateSubmitted: 'May 24, 2024', status: 'Pending', documents: ['Medical Certificate.pdf', 'Receipt.pdf'] },
  { id: 'IR-2024-0074', type: 'Incident', requestedBy: 'Carlos Mendoza', dateSubmitted: 'May 23, 2024', status: 'Pending', documents: ['Witness Statement.pdf'] },
  { id: 'FR-2024-0047', type: 'Financial', requestedBy: 'Liza Torres', dateSubmitted: 'May 22, 2024', status: 'Pending', documents: ['Certificate of Indigency.pdf'] },
];

export const documents = [
  { id: 'DOC-0142', name: 'Certificate of Indigency.pdf', owner: 'Juan Dela Cruz', linkedTo: 'FR-2024-0052', uploaded: 'May 26, 2024', size: '412 KB', status: 'Verified' },
  { id: 'DOC-0141', name: 'Hospital Bill.pdf', owner: 'Juan Dela Cruz', linkedTo: 'FR-2024-0052', uploaded: 'May 26, 2024', size: '1.1 MB', status: 'Pending' },
  { id: 'DOC-0140', name: 'Enrollment Verification.pdf', owner: 'Maria Santos', linkedTo: 'FR-2024-0051', uploaded: 'May 25, 2024', size: '220 KB', status: 'Pending' },
  { id: 'DOC-0139', name: 'Photo Evidence.jpg', owner: 'Anonymous', linkedTo: 'IR-2024-0076', uploaded: 'May 25, 2024', size: '3.4 MB', status: 'Verified' },
  { id: 'DOC-0138', name: 'Medical Certificate.pdf', owner: 'Ana Garcia', linkedTo: 'FR-2024-0049', uploaded: 'May 24, 2024', size: '540 KB', status: 'Rejected' },
  { id: 'DOC-0137', name: 'Witness Statement.pdf', owner: 'Carlos Mendoza', linkedTo: 'IR-2024-0074', uploaded: 'May 23, 2024', size: '180 KB', status: 'Verified' },
  { id: 'DOC-0136', name: 'Receipt.pdf', owner: 'Ana Garcia', linkedTo: 'FR-2024-0049', uploaded: 'May 22, 2024', size: '96 KB', status: 'Pending' },
];

export const announcements = [
  { id: 'AN-014', title: 'Please review all pending requests and verifications regularly to ensure timely assistance.', audience: 'All Staff', postedBy: 'Admin', date: 'May 20, 2024', pinned: true },
  { id: 'AN-013', title: 'Scholarship & financial assistance application window opens June 3 for AY 2024-2025.', audience: 'All Students', postedBy: 'Finance & Scholarship Office', date: 'May 18, 2024', pinned: false },
  { id: 'AN-012', title: 'Reminder: incident reports involving minors must be escalated to Guidance within 24 hours.', audience: 'Case Officers', postedBy: 'Office of Student Affairs', date: 'May 14, 2024', pinned: false },
  { id: 'AN-011', title: 'System maintenance scheduled May 30, 10:00 PM \u2013 12:00 AM. Expect brief downtime.', audience: 'All Staff', postedBy: 'Admin', date: 'May 12, 2024', pinned: false },
  { id: 'AN-010', title: 'New anonymous reporting channel now available on the student portal.', audience: 'All Students', postedBy: 'Campus Security', date: 'May 8, 2024', pinned: false },
];

export const messages = [
  { id: 'MSG-201', from: 'Maria Santos', subject: 'Follow-up on FR-2024-0051', preview: 'Good day po, gusto ko lang po sana malaman kung ano na po status ng...', date: '10:42 AM', unread: true, thread: [
    { from: 'Maria Santos', body: 'Good day po, gusto ko lang po sana malaman kung ano na po status ng aking request para sa financial assistance.', time: 'May 27, 10:42 AM' },
  ]},
  { id: 'MSG-200', from: 'Juan Dela Cruz', subject: 'Additional documents uploaded', preview: 'Hi, I\u2019ve uploaded the hospital bill you requested for my case.', date: 'Yesterday', unread: true, thread: [
    { from: 'Juan Dela Cruz', body: 'Hi, I\u2019ve uploaded the hospital bill you requested for my case FR-2024-0052.', time: 'May 26, 4:15 PM' },
    { from: 'Admin User', body: 'Thank you, Juan. We\u2019ll review this within 2 business days.', time: 'May 26, 4:40 PM' },
  ]},
  { id: 'MSG-199', from: 'Carlos Mendoza', subject: 'Witness statement clarification', preview: 'Sir/Ma\u2019am, may tanong lang po ako tungkol sa aking isinumite na...', date: 'May 25', unread: false, thread: [
    { from: 'Carlos Mendoza', body: 'Sir/Ma\u2019am, may tanong lang po ako tungkol sa aking isinumite na witness statement kanina.', time: 'May 25, 2:05 PM' },
  ]},
  { id: 'MSG-198', from: 'Ana Garcia', subject: 'Re: Medical Certificate rejected', preview: 'Okay po, magpapadala po ako ng bagong kopya ngayong araw.', date: 'May 24', unread: false, thread: [
    { from: 'Admin User', body: 'Hi Ana, the medical certificate you submitted appears incomplete. Could you send an updated copy?', time: 'May 24, 9:00 AM' },
    { from: 'Ana Garcia', body: 'Okay po, magpapadala po ako ng bagong kopya ngayong araw.', time: 'May 24, 9:20 AM' },
  ]},
];

export const auditLogs = [
  { id: 'LOG-3021', actor: 'Admin User', action: 'Approved financial request FR-2024-0052', target: 'FR-2024-0052', date: 'May 27, 2024 9:41 AM', ip: '192.168.1.14' },
  { id: 'LOG-3020', actor: 'Bartolome Reyes', action: 'Updated incident report status to Investigating', target: 'IR-2024-0076', date: 'May 27, 2024 9:12 AM', ip: '192.168.1.22' },
  { id: 'LOG-3019', actor: 'Edgar Malabanan', action: 'Verified document Enrollment Verification.pdf', target: 'DOC-0140', date: 'May 26, 2024 4:55 PM', ip: '192.168.1.09' },
  { id: 'LOG-3018', actor: 'Admin User', action: 'Sent announcement to All Students', target: 'AN-013', date: 'May 26, 2024 2:30 PM', ip: '192.168.1.14' },
  { id: 'LOG-3017', actor: 'Ivy Tan-Ocampo', action: 'Assigned IR-2024-0074 to Bartolome Reyes', target: 'IR-2024-0074', date: 'May 26, 2024 11:05 AM', ip: '192.168.1.31' },
  { id: 'LOG-3016', actor: 'Admin User', action: 'Created new admin account for Noel Villafuerte', target: 'ADM-006', date: 'May 25, 2024 3:18 PM', ip: '192.168.1.14' },
  { id: 'LOG-3015', actor: 'Corazon Fajardo', action: 'Rejected document Medical Certificate.pdf', target: 'DOC-0138', date: 'May 24, 2024 1:47 PM', ip: '192.168.1.45' },
  { id: 'LOG-3014', actor: 'Admin User', action: 'Updated role permissions for Finance Reviewer', target: 'R-03', date: 'May 23, 2024 10:02 AM', ip: '192.168.1.14' },
];

export const recentActivities = [
  { id: 1, icon: 'check', color: 'green', title: 'Financial request #FR-2024-0052', detail: 'Approved', time: '2 minutes ago' },
  { id: 2, icon: 'clock', color: 'orange', title: 'Incident report #IR-2024-0076', detail: 'Under review', time: '15 minutes ago' },
  { id: 3, icon: 'file', color: 'blue', title: 'New financial request submitted', detail: '#FR-2024-0053', time: '1 hour ago' },
  { id: 4, icon: 'upload', color: 'purple', title: 'Documents uploaded by user', detail: '#FR-2024-0051', time: '2 hours ago' },
  { id: 5, icon: 'check', color: 'green', title: 'Assistance released to student', detail: '#FR-2024-0048', time: '3 hours ago' },
];

export const weeklyReportsOverview = [
  { day: 'Mon', incidents: 12, financial: 8 },
  { day: 'Tue', incidents: 15, financial: 11 },
  { day: 'Wed', incidents: 13, financial: 9 },
  { day: 'Thu', incidents: 31, financial: 15 },
  { day: 'Fri', incidents: 22, financial: 12 },
  { day: 'Sat', incidents: 17, financial: 10 },
  { day: 'Sun', incidents: 26, financial: 14 },
];

export const requestsByStatus = [
  { name: 'Submitted', value: 18, color: '#2F6FED' },
  { name: 'Under Verification', value: 23, color: '#F59E0B' },
  { name: 'Additional Documents', value: 8, color: '#FBBF24' },
  { name: 'Approved', value: 34, color: '#16A34A' },
  { name: 'Partially Approved', value: 9, color: '#7C3AED' },
  { name: 'Declined', value: 6, color: '#EF4444' },
  { name: 'Assistance Released', value: 18, color: '#14B8A6' },
];

export const topRequestTypes = [
  { type: 'Hospital/Medical Bills', count: 18 },
  { type: 'Medicine Expenses', count: 9 },
  { type: 'Transportation', count: 6 },
  { type: 'Food & Daily Needs', count: 5 },
  { type: 'School-related Expenses', count: 4 },
  { type: 'Other Expenses', count: 10 },
];

export const dashboardStats = {
  totalReports: 128,
  totalReportsDelta: '+12 this week',
  incidentReports: 76,
  incidentReportsDelta: '+8 this week',
  financialRequests: 52,
  financialRequestsDelta: '+4 this week',
  pendingVerifications: 23,
  approvedRequests: 34,
  assistanceReleased: 18,
};
