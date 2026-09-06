/**
 * Router induk API: memetakan semua sub-router modul ke prefix URL-nya.
 * Dipasang di app.ts di bawah path /api sehingga seluruh endpoint
 * berada di bawah /api/<modul>.
 */

import { Router } from 'express';
import authRoutes from '../modules/auth/auth.route.js';
import userRoutes from '../modules/users/users.route.js';
import conversationRoutes, {
  starredRouter,
  reactedRouter,
} from '../modules/conversations/conversations.route.js';
import groupRoutes from '../modules/groups/groups.route.js';
import contactRoutes from '../modules/contacts/contacts.route.js';
import notificationRoutes from '../modules/notifications/notifications.route.js';
import deviceRoutes from '../modules/devices/devices.route.js';
import searchRoutes, { dmSearchRouter } from '../modules/search/search.route.js';

/** Router utama yang menggabungkan seluruh rute modul RealChat. */
const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/conversations', conversationRoutes);
// starredRouter menangani rute pesan berbintang di /messages,
// reactedRouter menangani rute pesan yang direaksi di /messages,
// dmSearchRouter menangani pencarian DM di /dm (dipisah dari modul utamanya).
router.use('/messages', starredRouter);
router.use('/messages', reactedRouter);
router.use('/groups', groupRoutes);
router.use('/contacts', contactRoutes);
router.use('/notifications', notificationRoutes);
router.use('/devices', deviceRoutes);
router.use('/search', searchRoutes);
router.use('/dm', dmSearchRouter);

/** Ekspor router gabungan untuk dipasang di aplikasi Express. */
export default router;
