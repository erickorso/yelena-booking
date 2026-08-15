export type { IUserRepository, CreateUserProfileInput } from "./IUserRepository";
export type { CreateSpecialistProfileInput } from "./specialistTypes";
export type {
  IAppointmentRepository,
  CreateAppointmentInput,
  AppointmentFilters,
} from "./IAppointmentRepository";
export type {
  IEhrRepository,
  CreateEhrNoteInput,
  CreateMedicalFileInput,
} from "./IEhrRepository";
export { StubUserRepository } from "./stubs/StubUserRepository";
export { StubAppointmentRepository } from "./stubs/StubAppointmentRepository";
export { StubEhrRepository } from "./stubs/StubEhrRepository";
// AdminUserRepository is server-only — import from
// `@/repositories/firestore/AdminUserRepository` in Route Handlers / scripts.
