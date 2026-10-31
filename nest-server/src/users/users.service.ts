import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Finds a user by normalized email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = User.normalizeEmail(email);
    return this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
  }

  /**
   * Finds a user by unique identifier.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: ['credentials'],
    });
  }

  /**
   * Creates a user in PENDING status during initial passkey registration.
   */
  async createPendingUser(email: string): Promise<User> {
    const normalizedEmail = User.normalizeEmail(email);
    const user = this.userRepository.create({
      email: normalizedEmail,
      status: UserStatus.PENDING,
    });
    return this.userRepository.save(user);
  }

  /**
   * Activates a pending user upon successful credential verification.
   */
  async activateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    if (user.status === UserStatus.PENDING) {
      user.status = UserStatus.ACTIVE;
      return this.userRepository.save(user);
    }
    return user;
  }
}

