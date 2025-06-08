import supertest from 'supertest';
   import app from '@/app';
   import prisma from '@/config/database';

   describe('Auth API', () => {
     beforeAll(async () => {
       await prisma.$connect();
     });

     afterAll(async () => {
       await prisma.$disconnect();
     });

     beforeEach(async () => {
       await prisma.user.deleteMany();
       await prisma.otp.deleteMany();
     });

     it('should signup a new user', async () => {
       const response = await supertest(app)
         .post('/api/auth/signup')
         .send({
           email: 'test@example.com',
           password: 'password123',
           name: 'Test User',
         });
       expect(response.status).toBe(200);
       const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
       expect(user).toBeDefined();
       expect(user?.isActive).toBe(false);
     });

     it('should fail to signup with existing email', async () => {
       await prisma.user.create({
         data: {
           email: 'test@example.com',
           password: 'hashed',
           name: 'Test User',
           role: 'APPLICANT',
           createdAt: new Date(),
         },
       });
       const response = await supertest(app)
         .post('/api/auth/signup')
         .send({
           email: 'test@example.com',
           password: 'password123',
           name: 'Test User',
         });
       expect(response.status).toBe(409);
       expect(response.body.error).toBe('Email already exists');
     });

     it('should login with valid credentials', async () => {
       await prisma.user.create({
         data: {
           email: 'test@example.com',
           password: await import('bcryptjs').then(({ hash }) => hash('password123', 10)),
           name: 'Test User',
           role: 'APPLICANT',
           isActive: true,
           createdAt: new Date(),
         },
       });
       const response = await supertest(app)
         .post('/api/auth/login')
         .send({
           email: 'test@example.com',
           password: 'password123',
         });
       expect(response.status).toBe(200);
       expect(response.body.token).toBeDefined();
       expect(response.body.refreshToken).toBeDefined();
     });
   });