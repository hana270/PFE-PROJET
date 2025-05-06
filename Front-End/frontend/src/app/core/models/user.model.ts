// user.model.ts
export class User {
  user_id?: number;  // Make it optional again
  username: string = '';
  password?: string = '';
  email: string = '';
  enabled?: boolean = false;
  firstName: string = '';
  lastName: string = '';
  phone: string = '';
  defaultAddress: string = '';
  profileImage?: string = '';
  resetToken?: string;
  validationCode?: string;
  roles: any[] = [];
  jwtToken?: string;

  // Make constructor optional
  constructor(user_id?: number) {
    if (user_id) {
      this.user_id = user_id;
    }
    this.username = '';
    this.email = '';
    this.password = '';
    this.firstName = '';
    this.lastName = '';
    this.phone = '';
    this.defaultAddress = '';
  }
}