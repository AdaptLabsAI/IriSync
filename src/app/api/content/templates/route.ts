import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '../../../../lib/auth/utils';
import {
  PostTemplateService,
  PostTemplateCategory,
  PostTemplatePlatform,
  CreateTemplateParams
} from '../../../../lib/content/posts/templates';
import { logger } from '../../../../lib/logging/logger';

const templateService = new PostTemplateService();

export async function GET(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) {
      logger.warn({ type: 'request', method: 'GET', url: req.url, statusCode: 401 }, 'Unauthorized');
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const platform = searchParams.get('platform');
    const includeDefaults = searchParams.get('includeDefaults') ?? 'true';
    const limit = searchParams.get('limit') ?? '20';
    const offset = searchParams.get('offset') ?? '0';
    const sortBy = searchParams.get('sortBy') ?? 'popularity';
    const sortDirection = searchParams.get('sortDirection') ?? 'desc';
    const organizationId = searchParams.get('organizationId');
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);
    const parsedIncludeDefaults = includeDefaults === 'true';
    const result = await templateService.searchTemplates({
      category: category as PostTemplateCategory,
      platform: platform as PostTemplatePlatform,
      organizationId: organizationId || undefined,
      userId,
      includeDefaults: parsedIncludeDefaults,
      limit: parsedLimit,
      offset: parsedOffset,
      sortBy: sortBy as 'popularity' | 'createdAt' | 'updatedAt' | 'name',
      sortDirection: sortDirection as 'asc' | 'desc'
    });
    const response = {
      templates: result.templates,
      total: result.total,
      hasMore: result.templates.length + parsedOffset < result.total,
      filters: {
        categories: Object.values(PostTemplateCategory),
        platforms: Object.values(PostTemplatePlatform)
      }
    };
    logger.info({ type: 'request', method: 'GET', url: req.url, statusCode: 200 }, 'Templates GET success');
    logRequestDuration(req, 200, startTime);
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    logger.error({ type: 'request', method: 'GET', url: req.url, error }, 'Templates GET error');
    logRequestDuration(req, 500, startTime);
    return NextResponse.json({ error: 'An error occurred while processing your request', message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const startTime = process.hrtime();
  try {
    const userId = await verifyAuthentication(req);
    if (!userId) {
      logger.warn({ type: 'request', method: 'POST', url: req.url, statusCode: 401 }, 'Unauthorized');
      return NextResponse.json({ error: 'Unauthorized', message: 'Authentication required' }, { status: 401 });
    }
    const body = await req.json();
    const { name, description, category, platforms, content, variables, organizationId } = body;
    if (!name || !description || !category || !platforms || !content) {
      return NextResponse.json({ error: 'Bad Request', message: 'Name, description, category, platforms, and content are required' }, { status: 400 });
    }
    if (!Object.values(PostTemplateCategory).includes(category)) {
      return NextResponse.json({ error: 'Bad Request', message: `Invalid category. Must be one of: ${Object.values(PostTemplateCategory).join(', ')}` }, { status: 400 });
    }
    for (const platform of platforms) {
      if (!Object.values(PostTemplatePlatform).includes(platform)) {
        return NextResponse.json({ error: 'Bad Request', message: `Invalid platform "${platform}". Must be one of: ${Object.values(PostTemplatePlatform).join(', ')}` }, { status: 400 });
      }
    }
    const templateParams: CreateTemplateParams = {
      name,
      description,
      category,
      platforms,
      content,
      variables,
      userId,
      organizationId
    };
    const template = await templateService.createTemplate(templateParams);
    logger.info({ type: 'request', method: 'POST', url: req.url, statusCode: 201 }, 'Templates POST success');
    logRequestDuration(req, 201, startTime);
    return NextResponse.json({ message: 'Template created successfully', template }, { status: 201 });
  } catch (error: any) {
    logger.error({ type: 'request', method: 'POST', url: req.url, error }, 'Templates POST error');
    logRequestDuration(req, 500, startTime);
    return NextResponse.json({ error: 'An error occurred while processing your request', message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : 'Internal server error' }, { status: 500 });
  }
}

function logRequestDuration(req: NextRequest, statusCode: number, startTime: [number, number]) {
  const duration = process.hrtime(startTime);
  const durationMs = Math.round((duration[0] * 1e9 + duration[1]) / 1e6);
  logger.info({ method: req.method, url: req.url, statusCode, durationMs }, `Request duration: ${durationMs}ms`);
} 