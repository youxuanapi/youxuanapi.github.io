import { NextRequest, NextResponse } from 'next/server';
import {
  savePersona,
  loadPersonas,
  loadPersona,
  updatePersona,
  deletePersona,
} from '../../../lib/local-storage';

export async function GET() {
  try {
    const personas = await loadPersonas();
    return NextResponse.json({ personas });
  } catch (error) {
    console.error('加载人格列表失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '加载失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const persona = await savePersona(body);
    return NextResponse.json({ persona });
  } catch (error) {
    console.error('保存人格失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '保存失败' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { personaId, updates } = body;
    const persona = await updatePersona(personaId, updates);
    if (!persona) {
      return NextResponse.json({ error: '人格不存在' }, { status: 404 });
    }
    return NextResponse.json({ persona });
  } catch (error) {
    console.error('更新人格失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { personaId } = body;
    await deletePersona(personaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除人格失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '删除失败' },
      { status: 500 }
    );
  }
}
