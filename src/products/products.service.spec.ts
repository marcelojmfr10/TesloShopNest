import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product, ProductImage } from './entities';
import { DataSource, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { User } from '../auth/entities/user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: Repository<Product>;
  let productImageRepository: Repository<ProductImage>;

  let mockQueryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      save: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        delete: jest.fn(),
      },
    };

    const mockQueryBuilder = {
      where: jest.fn(() => mockQueryBuilder),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'uuid_valid',
        title: 'product 1',
        slug: 'product-1',
        images: [
          {
            id: '1',
            url: 'image1.jpg',
          },
        ],
      }),
    };

    const mockProductRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      preload: jest.fn(),
      remove: jest.fn(),
    };

    const mockProductImageRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const mockDatasource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
        {
          provide: getRepositoryToken(ProductImage),
          useValue: mockProductImageRepository,
        },
        {
          provide: DataSource,
          useValue: mockDatasource,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get<Repository<Product>>(
      getRepositoryToken(Product),
    );
    productImageRepository = module.get<Repository<ProductImage>>(
      getRepositoryToken(ProductImage),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a product', async () => {
    const dto = {
      title: 'test product',
      price: 100,
      images: ['img1.jpg'],
    } as CreateProductDto;

    const { images: dtoWithoutImages, ...createDto } = dto;

    const user = {
      id: '1',
      email: 'test@google.com',
    } as User;

    const product = {
      id: '1',
      ...createDto,
      user,
    } as unknown as Product;

    jest.spyOn(productRepository, 'create').mockReturnValue(product);
    jest.spyOn(productRepository, 'save').mockResolvedValue(product);
    jest
      .spyOn(productImageRepository, 'create')
      .mockImplementation((imageData) => imageData as unknown as ProductImage);

    const result = await service.create(dto, user);
    expect(result).toEqual({
      id: '1',
      title: 'test product',
      price: 100,
      images: ['img1.jpg'],
      user: { id: '1', email: 'test@google.com' },
    });
  });

  it('should throw a BadRequestException if create product fails', async () => {
    jest.spyOn(productRepository, 'save').mockRejectedValue({
      code: '23505',
      detail: 'Cannot create product',
    });

    const dto = {} as CreateProductDto;

    const user = {} as User;
    await expect(service.create(dto, user)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.create(dto, user)).rejects.toThrow(
      'Cannot create product',
    );
  });

  it('should find all products', async () => {
    const dto = {
      limit: 10,
      offset: 0,
      gender: 'men',
    } as PaginationDto;

    const products = [
      { id: '1', title: 'product 1', images: [{ id: '1', url: 'image1.jpg' }] },
      { id: '2', title: 'product 2', images: [{ id: '2', url: 'image2.jpg' }] },
    ] as unknown as Product[];

    const totalProducts = 2;

    jest.spyOn(productRepository, 'find').mockResolvedValue(products);
    jest.spyOn(productRepository, 'count').mockResolvedValue(products.length);

    const result = await service.findAll(dto);
    expect(result).toEqual({
      count: 2,
      pages: 1,
      products: products.map((product) => ({
        ...product,
        images: product.images?.map((img) => img.url),
      })),
    });
  });

  it('should find a product by valid ID', async () => {
    const productId = '0caf4236-0763-4c91-9578-3d2acfbf4bcc';

    const product = {
      id: productId,
      title: 'test product',
    } as Product;

    jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(product);

    const result = await service.findOne(productId);
    expect(result).toEqual({
      id: '0caf4236-0763-4c91-9578-3d2acfbf4bcc',
      title: 'test product',
    });
  });

  it('should throw an error if id was not found', async () => {
    const productId = '0caf4236-0763-4c91-9578-3d2acfbf4bcc';
    jest.spyOn(productRepository, 'findOneBy').mockResolvedValue(null);

    await expect(service.findOne(productId)).rejects.toThrow(NotFoundException);
    await expect(service.findOne(productId)).rejects.toThrow(
      `Product with term ${productId} not found`,
    );
  });

  it('should return product by term or slug', async () => {
    const result = await service.findOne('product 1');

    expect(result).toEqual({
      id: 'uuid_valid',
      title: 'product 1',
      slug: 'product-1',
      images: [{ id: '1', url: 'image1.jpg' }],
    });
  });

  it('should throw an error NotFoundException if product not found', async () => {
    const dto = {} as UpdateProductDto;
    const user = {} as User;

    jest.spyOn(productRepository, 'preload').mockResolvedValue(undefined);

    await expect(service.update('abc', dto, user)).rejects.toThrow(
      new NotFoundException(`Product with id abc not found`),
    );
  });

  it('should update product successfully', async () => {
    const productId = 'abc';

    const dto = {
      title: 'updated product',
      slug: 'updated-product',
    } as UpdateProductDto;

    const user = {
      id: '1',
      fullName: 'Marcelo Fuentes',
    } as User;

    const product = {
      ...dto,
      price: 100,
      description: 'some description',
    } as unknown as Product;

    jest.spyOn(productRepository, 'preload').mockResolvedValue(product);

    const updatedProduct = await service.update(productId, dto, user);
    expect(updatedProduct).toEqual({
      id: 'uuid_valid',
      title: 'product 1',
      slug: 'product-1',
      images: ['image1.jpg'],
    });
  });

  it('should update product and commitTransaction', async () => {
    const productId = 'abc';

    const dto = {
      title: 'updated product',
      slug: 'updated-product',
      images: [{ id: '1', url: 'image1.jpg' }],
    } as unknown as UpdateProductDto;

    const user = {
      id: '1',
      fullName: 'Marcelo Fuentes',
    } as User;

    const product = {
      ...dto,
      price: 100,
      description: 'some description',
    } as unknown as Product;

    jest.spyOn(productRepository, 'preload').mockResolvedValue(product);

    await service.update(productId, dto, user);

    expect(mockQueryRunner.connect).toHaveBeenCalled();
    expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.manager.delete).toHaveBeenCalled();
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    expect(mockQueryRunner.release).toHaveBeenCalled();
  });
});
