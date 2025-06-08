import prisma from '../config/database';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { Role } from '../generated/prisma';
import { generateSlug, generateUniqueSlug } from '../utils/slug.utils';

export class VisaService {
  async createVisaType(userEmail: string, data: {
    name: string;
    description?: string;
    price: number;
    processingTime: string;
    duration: string;
    requirements: string[];
    eligibleCountries: string[];
    coverImage?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.role !== Role.ADMIN && user.role !== Role.OFFICER) {
      throw new ForbiddenError('Only admins and officers can create visa types');
    }

    // Generate base slug from name
    const baseSlug = generateSlug(data.name);

    // Get all existing slugs
    const existingSlugs = await prisma.visaType.findMany({
      select: { slug: true }
    }).then(types => types.map(type => type.slug));

    // Generate unique slug
    const slug = generateUniqueSlug(baseSlug, existingSlugs);

    const visaType = await prisma.visaType.create({
      data: {
        ...data,
        slug,
        isActive: true
      }
    });

    return visaType;
  }

  async getAllVisaTypes() {
    return prisma.visaType.findMany({
      // where: { isActive: true }
    });
  }

  async getAllVisaTypesWithoutFilter() {
    return prisma.visaType.findMany({});
  }

  async getVisaTypeById(id: string) {
    const visaType = await prisma.visaType.findUnique({
      where: { id }
    });

    if (!visaType) {
      throw new NotFoundError('Visa type not found');
    }

    return visaType;
  }

  async getVisaTypeBySlug(slug: string) {
    const visaType = await prisma.visaType.findUnique({
      where: { slug }
    });

    if (!visaType) {
      throw new NotFoundError('Visa type not found');
    }

    return visaType;
  }

  async updateVisaType(userEmail: string, id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    processingTime?: string;
    duration?: string;
    requirements?: string[];
    eligibleCountries?: string[];
    isActive?: boolean;
    slug?: string;
    coverImage?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.role !== Role.ADMIN && user.role !== Role.OFFICER) {
      throw new ForbiddenError('Only admins and officers can update visa types');
    }

    const visaType = await prisma.visaType.findUnique({ where: { id } });
    if (!visaType) {
      throw new NotFoundError('Visa type not found');
    }

    // If name is being updated, generate a new slug
    let updateData = { ...data };
    if (data.name) {
      const baseSlug = generateSlug(data.name);
      const existingSlugs = await prisma.visaType.findMany({
        where: { id: { not: id } },
        select: { slug: true }
      }).then(types => types.map(type => type.slug));
      updateData.slug = generateUniqueSlug(baseSlug, existingSlugs);
    }

    const updatedVisaType = await prisma.visaType.update({
      where: { id },
      data: updateData
    });

    return updatedVisaType;
  }

  async deleteVisaType(userEmail: string, id: string) {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      throw new NotFoundError('User not found');
    }
    if (user.role !== Role.ADMIN && user.role !== Role.OFFICER) {
      throw new ForbiddenError('Only admins and officers can delete visa types');
    }

    const visaType = await prisma.visaType.findUnique({ where: { id } });
    if (!visaType) {
      throw new NotFoundError('Visa type not found');
    }

    // Soft delete by setting isActive to false
    await prisma.visaType.update({
      where: { id },
      data: { isActive: false }
    });

    return { message: 'Visa type deleted successfully' };
  }
}