import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from './../prisma/prisma.service'
import { AuthDto } from "./dto";
import * as argon from 'argon2'
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwt: JwtService,
        private config: ConfigService
    ) { }

    async signup(dto: AuthDto) {
        const hash = await argon.hash(dto.password);

        try {
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    hash
                }
            })

            delete user.hash;

            return user;
        }

        catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    throw new ForbiddenException('Credentials Taken');
                }
            }
            throw error;
        }
    }

    async signin(dto: AuthDto) {
        const user = await this.prisma.user.findUnique({
            where: {
                email: dto.email
            }
        });

        if (!user) {
            throw new ForbiddenException("Wrong Credentials")
        }

        const passwordsMatch = await argon.verify(
            user.hash,
            dto.password
        );

        if (!passwordsMatch) {
            throw new ForbiddenException("Wrong Credentials")
        }

        const { id, email } = user;
        const token = this.signToken(id, email)
        return token;
    }

    async signToken(userId: number, email: string): Promise<{ access_token: string }>{
        const payload = {
            sub: userId,
            email,
        }

        const secret = this.config.get('JWT_SECRET');

        const token = await this.jwt.signAsync(payload, {
            expiresIn: '9999m',
            secret
        })

        return {
            access_token: token,
        };
    }
}