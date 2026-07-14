import { IsString, Length, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 20, { message: 'Username must be between 3 and 20 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username must contain only letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @Length(8, 50, { message: 'Password must be between 8 and 50 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/,
    {
      message:
        'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&#)',
    },
  )
  password: string;

  @IsString()
  @Length(2, 50, {
    message: 'Display name must be between 2 and 50 characters',
  })
  displayName: string;

  @IsString()
  @Matches(/^\+?[0-9]{9,15}$/, { message: 'Invalid phone number format' })
  phone: string;
}
