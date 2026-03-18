import { Router } from 'express';
import * as userController from './user.controller';
import { authenticate } from '../auth/auth.middleware';
import { validateRequest } from '../../shared/middleware/validateRequest';
import {
  updateProfileSchema,
  updateLocationSchema,
  updateInterestsSchema,
  reorderPhotosSchema,
} from './user.validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Profile
router.get('/me', userController.getMe);
router.put('/me', validateRequest(updateProfileSchema), userController.updateMe);
router.get('/me/reputation', userController.getReputation);

// Location
router.put('/me/location', validateRequest(updateLocationSchema), userController.updateLocation);

// Photos
router.post('/me/photos', userController.addPhoto);
router.delete('/me/photos/:photoId', userController.deletePhoto);
router.put('/me/photos/reorder', validateRequest(reorderPhotosSchema), userController.reorderPhotos);

// Interests
router.get('/interests', userController.getInterests);
router.put('/me/interests', validateRequest(updateInterestsSchema), userController.updateInterests);

// Push token
router.put('/me/push-token', userController.updatePushToken);

// Delete account
router.delete('/me', userController.deleteAccount);

// Verification
router.post('/me/verify', userController.requestVerification);

// Share link
router.post('/me/share-link', userController.generateShareLink);

// Premium
router.post('/me/premium', userController.activatePremium);

// Premium Debug (activate premium for 7 days without Stripe)
router.post('/me/premium-debug', userController.activatePremiumDebug);

// Boost
router.post('/me/boost', userController.activateBoost);

// Travel Mode
router.post('/me/travel', userController.enableTravelMode);
router.delete('/me/travel', userController.disableTravelMode);

// Public profile
router.get('/:id', userController.getUser);

export default router;
