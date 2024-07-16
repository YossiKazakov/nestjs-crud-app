import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './../prisma/prisma.service';
import { CreateBookmarkDto, EditBookmarkDto } from './dto';

@Injectable()
export class BookmarkService {
    constructor(private prisma: PrismaService) { }

    getBookmarks(userId: number) {
        const bookmarks = this.prisma.bookmark.findMany({
            where: { userId }
        });
        return bookmarks;
    }

    getBookmarkById(userId: number, bookmarkId: number) {
        const user = this.prisma.user.findUnique({
            where: { id: userId },
            include: { bookmarks: true }
        });
        const bookmark = user.then(user => user.bookmarks.find(bookmark => bookmark.id === bookmarkId));
        if (!bookmark) {
            throw new Error('Bookmark not found');
        }
        return bookmark;
    }

    updateBookmarkById(bookmarkId: number, dto: EditBookmarkDto) {
        const bookmark = this.prisma.bookmark.update({
            where: { id: bookmarkId },
            data: dto
        });
        return bookmark;
    }

    async deleteBookmarkById(userId: number, bookmarkId: number) {
        const bookmark = await this.prisma.bookmark.findUnique({
            where: { id: bookmarkId }
        });
        if (!bookmark) {
            throw new NotFoundException('Bookmark not found');
        }
        if (bookmark.userId !== userId) {
            throw new ForbiddenException('You are not allowed to delete this bookmark');
        }
        await this.prisma.bookmark.delete({
            where: { id: bookmarkId }
        });
    }

    createBookmark(userId: number, dto: CreateBookmarkDto) {
        const bookmark = this.prisma.bookmark.create({
            data: {
                ...dto,
                user: { connect: { id: userId } }
            }
        });
        return bookmark;
    }

}
