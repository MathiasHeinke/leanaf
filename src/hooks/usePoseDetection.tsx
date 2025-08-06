import { useState, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';

interface Landmark {
  x: number;
  y: number;
  confidence: number;
}

interface PoseKeypoints {
  nose: Landmark;
  leftShoulder: Landmark;
  rightShoulder: Landmark;
  leftHip: Landmark;
  rightHip: Landmark;
  leftKnee: Landmark;
  rightKnee: Landmark;
}

interface AlignmentData {
  rotation: number;
  cropBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks: PoseKeypoints;
}

export const usePoseDetection = () => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [poseModel, setPoseModel] = useState<any>(null);

  const initializePoseModel = useCallback(async () => {
    if (poseModel) return poseModel;
    
    try {
      const model = await pipeline(
        'object-detection',
        'Xenova/yolov8n-pose',
        { device: 'webgpu' }
      );
      setPoseModel(model);
      return model;
    } catch (error) {
      console.error('Failed to initialize pose model:', error);
      throw new Error('Pose detection model konnte nicht geladen werden');
    }
  }, [poseModel]);

  const detectPose = useCallback(async (imageElement: HTMLImageElement): Promise<AlignmentData | null> => {
    setIsDetecting(true);
    
    try {
      const model = await initializePoseModel();
      
      // Create canvas for processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Resize image if too large for processing
      const maxSize = 640;
      let { width, height } = imageElement;
      
      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width *= scale;
        height *= scale;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imageElement, 0, 0, width, height);

      // Convert to data URL for model input
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // Detect pose
      const results = await model(imageData);
      
      if (!results || results.length === 0) {
        throw new Error('Keine Pose erkannt');
      }

      // Find the most confident person detection
      const personDetection = results
        .filter((detection: any) => detection.label === 'person')
        .sort((a: any, b: any) => b.score - a.score)[0];

      if (!personDetection || !personDetection.keypoints) {
        throw new Error('Keine Körper-Landmarks gefunden');
      }

      // Extract key landmarks
      const keypoints = personDetection.keypoints;
      const landmarks: PoseKeypoints = {
        nose: keypoints[0] || { x: 0, y: 0, confidence: 0 },
        leftShoulder: keypoints[5] || { x: 0, y: 0, confidence: 0 },
        rightShoulder: keypoints[6] || { x: 0, y: 0, confidence: 0 },
        leftHip: keypoints[11] || { x: 0, y: 0, confidence: 0 },
        rightHip: keypoints[12] || { x: 0, y: 0, confidence: 0 },
        leftKnee: keypoints[13] || { x: 0, y: 0, confidence: 0 },
        rightKnee: keypoints[14] || { x: 0, y: 0, confidence: 0 }
      };

      // Calculate alignment
      const alignment = calculateAlignment(landmarks, width, height);
      
      return alignment;
    } catch (error) {
      console.error('Pose detection failed:', error);
      throw error;
    } finally {
      setIsDetecting(false);
    }
  }, [initializePoseModel]);

  const calculateAlignment = (landmarks: PoseKeypoints, imageWidth: number, imageHeight: number): AlignmentData => {
    // Calculate shoulder line angle for rotation
    const shoulderAngle = Math.atan2(
      landmarks.rightShoulder.y - landmarks.leftShoulder.y,
      landmarks.rightShoulder.x - landmarks.leftShoulder.x
    );
    const rotation = -shoulderAngle * (180 / Math.PI);

    // Calculate bounding box for the person
    const validLandmarks = Object.values(landmarks).filter(p => p.confidence > 0.3);
    
    if (validLandmarks.length === 0) {
      throw new Error('Nicht genügend verlässliche Landmarks gefunden');
    }

    const xs = validLandmarks.map(p => p.x);
    const ys = validLandmarks.map(p => p.y);
    
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Add padding around the person
    const padding = 0.15; // 15% padding
    const personWidth = maxX - minX;
    const personHeight = maxY - minY;
    
    const paddingX = personWidth * padding;
    const paddingY = personHeight * padding;

    // Ensure square crop for consistency
    const cropSize = Math.max(personWidth + paddingX * 2, personHeight + paddingY * 2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const cropBox = {
      x: Math.max(0, centerX - cropSize / 2),
      y: Math.max(0, centerY - cropSize / 2),
      width: Math.min(cropSize, imageWidth),
      height: Math.min(cropSize, imageHeight)
    };

    return {
      rotation,
      cropBox,
      landmarks
    };
  };

  const alignTwoImages = useCallback(async (
    image1: HTMLImageElement, 
    image2: HTMLImageElement
  ): Promise<{ alignment1: AlignmentData; alignment2: AlignmentData } | null> => {
    try {
      const [alignment1, alignment2] = await Promise.all([
        detectPose(image1),
        detectPose(image2)
      ]);

      if (!alignment1 || !alignment2) {
        throw new Error('Pose konnte in einem der Bilder nicht erkannt werden');
      }

      // Adjust second image alignment to match first image's pose
      const adjustedAlignment2 = matchPoseAlignment(alignment1, alignment2);

      return {
        alignment1,
        alignment2: adjustedAlignment2
      };
    } catch (error) {
      console.error('Image alignment failed:', error);
      throw error;
    }
  }, [detectPose]);

  const matchPoseAlignment = (reference: AlignmentData, target: AlignmentData): AlignmentData => {
    // Calculate relative scale and position adjustments
    const refShoulderWidth = Math.abs(reference.landmarks.rightShoulder.x - reference.landmarks.leftShoulder.x);
    const targetShoulderWidth = Math.abs(target.landmarks.rightShoulder.x - target.landmarks.leftShoulder.x);
    
    const scaleAdjustment = refShoulderWidth / targetShoulderWidth;
    
    // Adjust crop box to match reference proportions
    const adjustedCropBox = {
      ...target.cropBox,
      width: target.cropBox.width * scaleAdjustment,
      height: target.cropBox.height * scaleAdjustment
    };

    return {
      ...target,
      cropBox: adjustedCropBox,
      rotation: reference.rotation // Use same rotation as reference
    };
  };

  return {
    detectPose,
    alignTwoImages,
    isDetecting,
    initializePoseModel
  };
};