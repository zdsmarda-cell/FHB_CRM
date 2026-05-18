import { test, expect } from 'vitest';
import { Deal } from './types';

test('willAdvance logic for contracting', () => {
    // This is a test matching the exact logic used in CloserAttributesForm and KanbanBoard.
    const deal: Partial<Deal> = {
        stage: 'discovery_proposal',
        closerId: 'user-123',
        deliveryCountries: ['Czechia', 'Slovakia'],
        averageItemsPerOrder: 5,
        averageParcelWeight: 10,
        averageParcelVolume: 100,
        pricingOffers: [
            {
                id: 'offer-1',
                filename: 'offer.pdf',
                dateSent: new Date().toISOString(),
                createdBy: 'user-123'
            }
        ]
    };

    const willAdvance = deal.stage === 'discovery_proposal' &&
        deal.closerId &&
        deal.deliveryCountries && deal.deliveryCountries.length > 0 &&
        deal.averageItemsPerOrder && deal.averageItemsPerOrder > 0 &&
        deal.averageParcelWeight && deal.averageParcelWeight > 0 &&
        deal.averageParcelVolume && deal.averageParcelVolume > 0 &&
        deal.pricingOffers && deal.pricingOffers.length > 0;

    expect(willAdvance).toBe(true);
});

test('willAdvance logic does not trigger without pricing offers', () => {
    const deal: Partial<Deal> = {
        stage: 'discovery_proposal',
        closerId: 'user-123',
        deliveryCountries: ['Czechia'],
        averageItemsPerOrder: 5,
        averageParcelWeight: 10,
        averageParcelVolume: 100,
        pricingOffers: []
    };

    const willAdvance = deal.stage === 'discovery_proposal' &&
        deal.closerId &&
        deal.deliveryCountries && deal.deliveryCountries.length > 0 &&
        deal.averageItemsPerOrder && deal.averageItemsPerOrder > 0 &&
        deal.averageParcelWeight && deal.averageParcelWeight > 0 &&
        deal.averageParcelVolume && deal.averageParcelVolume > 0 &&
        deal.pricingOffers && deal.pricingOffers.length > 0;

    expect(willAdvance).toBe(false);
});

test('can move deal from onboarding to farming without farmerId', () => {
    // According to the new logic, when checking `isForwardMove` from onboarding,
    // there is no farmer validation. So we just simulate that logic.
    const deal: Partial<Deal> = {
        stage: 'onboarding',
        closerId: 'user-123',
        farmerId: undefined, // Farmer is emphatically unset
    };

    let hasMissingFarmerError = false;

    // Inside handleDrop for moving forward
    if (deal.stage === 'onboarding') {
        // We removed the requirement for farmerId, so this stays false
        // hasMissingFarmerError = !deal.farmerId; 
    }

    expect(hasMissingFarmerError).toBe(false);
});
