import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { CreateUserDto, LoginUserDto } from "./dto";
import * as bcrypt from 'bcrypt';
import { BadRequestException, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";


describe('AuthService', () => {

    let authService: AuthService;
    let userRepository: Repository<User>;

    beforeEach(async () => {

        const mockUserRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
        };

        const mockJwtService = {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService
                },
                AuthService,
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    })

    it('should be defined', () => {
        expect(authService).toBeDefined();
    });

    it('should create a user and return user with token', async () => {
        const dto: CreateUserDto = {
            email: 'test@google.com',
            password: 'Abc123',
            fullName: 'prueba usuario'
        };

        const user = {
            email: dto.email,
            fullName: dto.fullName,
            id: '1',
            isActive: true,
            roles: ['user']
        } as User;

        jest.spyOn(userRepository, 'create').mockReturnValue(user);
        jest.spyOn(bcrypt, 'hashSync').mockReturnValue('adfdafwkere');

        const result = await authService.create(dto);

        expect(bcrypt.hashSync).toHaveBeenCalledWith('Abc123', 10);

        expect(result).toEqual({
            email: 'test@google.com',
            fullName: 'prueba usuario',
            id: '1',
            isActive: true,
            roles: ['user'],
            token: 'mock-jwt-token'
        });
    });

    it('should throw an error if email already exists', async () => {
        const dto: CreateUserDto = {
            email: 'test@google.com',
            password: 'Abc123',
            fullName: 'prueba usuario'
        };

        jest.spyOn(userRepository, 'save').mockRejectedValue({ code: '23505', detail: 'Email already exists' });

        await expect(authService.create(dto)).rejects.toThrow(BadRequestException);
        await expect(authService.create(dto)).rejects.toThrow('Email already exists');
    });

    it('should throw an internal server error', async () => {
        const dto: CreateUserDto = {
            email: 'test@google.com'
        } as CreateUserDto;

        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { }); // para que no se muestren los mensajes en consola
        jest.spyOn(userRepository, 'save').mockRejectedValue({ code: '999', detail: 'Unhandled error' });

        await expect(authService.create(dto)).rejects.toThrow(InternalServerErrorException);
        await expect(authService.create(dto)).rejects.toThrow('Please check server logs');

        expect(console.log).toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledTimes(2);
        expect(console.log).toHaveBeenCalledWith({ code: '999', detail: 'Unhandled error' });

        logSpy.mockRestore();
    });

    it('should login user and return token', async () => {
        const dto: LoginUserDto = {
            email: 'test@google.com',
            password: 'Abc123',
        };

        const user = {
            ...dto,
            password: 'Abc123',
            isActive: true,
            roles: ['user'],
            fullName: 'test user',
        } as User;

        jest.spyOn(userRepository, 'findOne').mockResolvedValue(user);
        jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

        const result = await authService.login(dto);
        expect(result).toEqual({
            email: 'test@google.com',
            password: 'Abc123',
            isActive: true,
            roles: ['user'],
            fullName: 'test user',
            token: 'mock-jwt-token'
        });

        expect(result.password).toBeDefined();
    });

    it('should throw an Unauthorized exception if user does not exists', async () => {
        const dto = { email: 'test@google.com' } as LoginUserDto;

        jest.spyOn(userRepository, 'findOne').mockResolvedValue(null);

        await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(authService.login(dto)).rejects.toThrow('Credentials are not valid (email)');
    });

    it('should throw an Unauthorized exception if password not match', async () => {
        const dto = { email: 'test@google.com' } as LoginUserDto;

        jest.spyOn(userRepository, 'findOne').mockResolvedValue({
            password: 'xyz123',
        } as User);

        jest.spyOn(bcrypt, 'compareSync').mockReturnValue(false);

        await expect(authService.login(dto)).rejects.toThrow(UnauthorizedException);
        await expect(authService.login(dto)).rejects.toThrow('Credentials are not valid (password)');
    });

    it('should check auth status and return user with new token', async () => {

        const user = {
            id: "1",
            email: "test@google.com",
            password: "123",
            fullName: "test user",
            isActive: false,
            roles: ['user', 'admin'],
        } as User;

        const result = await authService.checkAuthStatus(user);
        expect(result).toEqual({
            id: '1',
            email: 'test@google.com',
            password: '123',
            fullName: 'test user',
            isActive: false,
            roles: ['user', 'admin'],
            token: 'mock-jwt-token'
        });
    });
});
