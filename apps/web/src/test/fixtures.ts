import {
  familyMemberDetailResponseSchema,
  familyMemberResponseSchema,
  locationResponseSchema,
  mediaResponseSchema,
  milestoneResponseSchema,
  placeDetailResponseSchema,
  placeResponseSchema,
  type FamilyMemberDetailResponse,
  type FamilyMemberResponse,
  type LocationResponse,
  type MediaResponse,
  type MilestoneResponse,
  type PlaceDetailResponse,
  type PlaceResponse,
} from '@time-capsule/shared';

// Fixtures are parsed with the shared schemas, so they can't drift from the contract.

let nextId = 1;

/** A valid api milestone. */
export function buildMilestone(
  overrides: Partial<MilestoneResponse> = {},
): MilestoneResponse {
  return milestoneResponseSchema.parse({
    id: nextId++,
    date: '2024-05-01',
    title: 'First steps',
    description: null,
    category: null,
    familyMembers: [],
    location: null,
    place: null,
    media: [],
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}

/** A ready photo as the api returns it (GET /media, an owner's `media`). */
export function buildMedia(overrides: Partial<MediaResponse> = {}): MediaResponse {
  const id = overrides.id ?? nextId++;
  return mediaResponseSchema.parse({
    id,
    url: `http://storage.test/time-capsule-media/media/${id}.png`,
    contentType: 'image/png',
    sizeBytes: 1024,
    createdAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}

/** A family member as the list (GET /family-members) returns them. */
export function buildFamilyMember(
  overrides: Partial<FamilyMemberResponse> = {},
): FamilyMemberResponse {
  return familyMemberResponseSchema.parse({
    id: nextId++,
    name: 'Ada',
    kind: 'human',
    description: null,
    birthDate: null,
    deathDate: null,
    motherId: null,
    fatherId: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}

/** A family member as GET /family-members/:id (and POST, PATCH) returns them. */
export function buildFamilyMemberDetail(
  overrides: Partial<FamilyMemberDetailResponse> = {},
): FamilyMemberDetailResponse {
  return familyMemberDetailResponseSchema.parse({
    ...buildFamilyMember(),
    mother: null,
    father: null,
    children: [],
    milestones: [],
    media: [],
    ...overrides,
  });
}

/** A location as GET /locations (and /locations/:id, POST, PATCH) returns it. */
export function buildLocation(
  overrides: Partial<LocationResponse> = {},
): LocationResponse {
  return locationResponseSchema.parse({
    id: nextId++,
    name: 'Kraków, Rynek',
    latitude: 50.061698,
    longitude: 19.937206,
    place: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}

/** A place as the list (GET /places) returns it. */
export function buildPlace(overrides: Partial<PlaceResponse> = {}): PlaceResponse {
  return placeResponseSchema.parse({
    id: nextId++,
    name: 'Home',
    description: null,
    location: null,
    createdAt: '2024-05-01T10:00:00.000Z',
    updatedAt: '2024-05-01T10:00:00.000Z',
    ...overrides,
  });
}

/** A place as GET /places/:id (and POST, PATCH) returns it. */
export function buildPlaceDetail(
  overrides: Partial<PlaceDetailResponse> = {},
): PlaceDetailResponse {
  return placeDetailResponseSchema.parse({
    ...buildPlace(),
    milestones: [],
    ...overrides,
  });
}
