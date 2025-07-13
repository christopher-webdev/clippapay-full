// File: express_backend/seeds/createAdWorkers.js
import User from '../models/User.js';

export default async function seedAdWorkers() {
  const workers = [
    { email: 'worker1@clippapay.com', password: 'ChangeMe123!', role: 'ad-worker', isVerified: true },
    { email: 'worker2@clippapay.com', password: 'ChangeMe123!', role: 'ad-worker', isVerified: true },
  ];

  for (const w of workers) {
    const existing = await User.findOne({ email: w.email });
    if (!existing) {
      const user = new User({
        email:      w.email,
        role:       w.role,
        isVerified: w.isVerified
      });
      await user.setPassword(w.password);
      await user.save();
      console.log(`➕ Created ad-worker ${w.email}`);
    } else {
      console.log(`✔️  Ad-worker ${w.email} already exists`);
    }
  }
}
