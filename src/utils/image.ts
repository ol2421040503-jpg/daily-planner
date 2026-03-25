/**
 * 每日规划 - 图片工具函数
 * @author 严辉村高斯林
 * @license MIT
 */

import { IMAGE_COMPRESSION_CONFIG } from '../config';

/**
 * 压缩图片
 */
export async function compressImage(
  file: File,
  options: Partial<typeof IMAGE_COMPRESSION_CONFIG> = {}
): Promise<string> {
  const config = { ...IMAGE_COMPRESSION_CONFIG, ...options };
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 计算缩放比例
        let { width, height } = img;
        
        if (width > config.maxWidth || height > config.maxHeight) {
          const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // 创建 canvas 并压缩
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为 base64
        const compressedDataUrl = canvas.toDataURL(config.mimeType, config.quality);
        resolve(compressedDataUrl);
      };
      
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩 base64 图片
 */
export async function compressBase64Image(
  base64: string,
  options: Partial<typeof IMAGE_COMPRESSION_CONFIG> = {}
): Promise<string> {
  const config = { ...IMAGE_COMPRESSION_CONFIG, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      if (width > config.maxWidth || height > config.maxHeight) {
        const ratio = Math.min(config.maxWidth / width, config.maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL(config.mimeType, config.quality);
      resolve(compressedDataUrl);
    };
    
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = base64;
  });
}

/**
 * 从剪贴板读取图片
 */
export async function readImageFromClipboard(): Promise<string | null> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    
    for (const item of clipboardItems) {
      const imageType = item.types.find(type => type.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error('读取剪贴板图片失败'));
          reader.readAsDataURL(blob);
        });
      }
    }
    
    return null;
  } catch (error) {
    console.error('读取剪贴板失败:', error);
    return null;
  }
}

/**
 * 下载图片
 */
export function downloadImage(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 获取图片尺寸
 */
export function getImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error('无法加载图片'));
    img.src = src;
  });
}

/**
 * 检查是否是有效的图片格式
 */
export function isValidImageType(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * 获取图片文件大小（格式化）
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
