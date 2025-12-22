"""
Video Perception Layer - Extracts numerical features from video/image signals.
Uses MediaPipe for face landmarks and gaze, FER for expression classification.
All metrics are computed over temporal windows and aggregated statistically.
"""

import io
import cv2
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

# Try to import mediapipe with fallback
try:
    import mediapipe as mp
    if hasattr(mp, 'solutions'):
        MP_AVAILABLE = True
    else:
        # Newer mediapipe versions have different structure
        from mediapipe.tasks import python as mp_tasks
        from mediapipe.tasks.python import vision
        MP_AVAILABLE = False
        logger.warning("MediaPipe solutions not available, using limited video analysis")
except ImportError:
    MP_AVAILABLE = False
    mp = None
    logger.warning("MediaPipe not available, video analysis disabled")


@dataclass
class VideoMetrics:
    """Container for all video-based metrics."""
    # Gaze and attention
    eye_contact_ratio: float = 0.0
    gaze_variance: float = 0.0
    head_turn_frequency: float = 0.0
    
    # Facial expression
    expression_variance: float = 0.0
    smile_ratio: float = 0.0
    neutral_face_ratio: float = 0.0
    emotion_mismatch_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "eye_contact_ratio": self.eye_contact_ratio,
            "gaze_variance": self.gaze_variance,
            "head_turn_frequency": self.head_turn_frequency,
            "expression_variance": self.expression_variance,
            "smile_ratio": self.smile_ratio,
            "neutral_face_ratio": self.neutral_face_ratio,
            "emotion_mismatch_score": self.emotion_mismatch_score
        }


class VideoPerception:
    """
    Extracts numerical features from video without making judgments.
    All outputs are raw metrics suitable for downstream processing.
    """
    
    # Head pose thresholds for eye contact detection
    YAW_THRESHOLD = 15.0  # degrees
    PITCH_THRESHOLD = 10.0  # degrees
    
    # Expression labels
    EXPRESSION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']
    
    def __init__(self):
        # Initialize MediaPipe Face Mesh if available
        self.mp_face_mesh = None
        self.face_mesh = None
        
        if MP_AVAILABLE and mp is not None:
            try:
                self.mp_face_mesh = mp.solutions.face_mesh
                self.face_mesh = self.mp_face_mesh.FaceMesh(
                    max_num_faces=1,
                    refine_landmarks=True,
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5
                )
                logger.info("MediaPipe Face Mesh initialized successfully")
            except Exception as e:
                logger.warning(f"MediaPipe initialization failed: {e}")
        
        # Try to load FER for expression detection
        self.fer_detector = None
        try:
            from fer import FER
            self.fer_detector = FER(mtcnn=True)
            logger.info("FER emotion detector loaded successfully")
        except ImportError:
            logger.warning("FER not available, expression detection disabled")
        except Exception as e:
            logger.warning(f"FER initialization failed: {e}")
        
        # Landmark indices for gaze estimation
        self.LEFT_EYE_INDICES = [33, 133, 160, 159, 158, 144, 145, 153]
        self.RIGHT_EYE_INDICES = [362, 263, 387, 386, 385, 373, 374, 380]
        self.LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]
        self.RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]
        
        # Face oval for head pose
        self.FACE_OVAL_INDICES = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 
                                   361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
                                   176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
                                   162, 21, 54, 103, 67, 109]
    
    def extract_metrics(
        self,
        video_data: bytes,
        fps: float = 30.0
    ) -> VideoMetrics:
        """
        Extract all video metrics from raw video bytes.
        
        Args:
            video_data: Raw video bytes
            fps: Frames per second for temporal analysis
            
        Returns:
            VideoMetrics containing all extracted features
        """
        metrics = VideoMetrics()
        
        try:
            frames = self._decode_video(video_data)
            
            if not frames:
                logger.warning("No frames extracted from video")
                return metrics
            
            # Process all frames
            frame_data = self._process_frames(frames)
            
            if not frame_data:
                return metrics
            
            # Aggregate metrics from frame data
            self._aggregate_gaze_metrics(metrics, frame_data)
            self._aggregate_expression_metrics(metrics, frame_data)
            self._calculate_head_turn_frequency(metrics, frame_data, fps)
            
        except Exception as e:
            logger.error(f"Video processing error: {e}")
        
        return metrics
    
    def extract_metrics_from_frames(
        self,
        frames: List[np.ndarray],
        fps: float = 30.0
    ) -> VideoMetrics:
        """
        Extract metrics from a list of frame arrays.
        
        Args:
            frames: List of BGR frame arrays
            fps: Frames per second
            
        Returns:
            VideoMetrics with aggregated statistics
        """
        metrics = VideoMetrics()
        
        if not frames:
            return metrics
        
        try:
            frame_data = self._process_frames(frames)
            
            if frame_data:
                self._aggregate_gaze_metrics(metrics, frame_data)
                self._aggregate_expression_metrics(metrics, frame_data)
                self._calculate_head_turn_frequency(metrics, frame_data, fps)
                
        except Exception as e:
            logger.error(f"Frame processing error: {e}")
        
        return metrics
    
    def extract_metrics_from_image(self, image_data: bytes) -> VideoMetrics:
        """
        Extract metrics from a single image.
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            VideoMetrics for the single frame
        """
        metrics = VideoMetrics()
        
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return metrics
            
            frame_data = self._process_frames([frame])
            
            if frame_data:
                self._aggregate_gaze_metrics(metrics, frame_data)
                self._aggregate_expression_metrics(metrics, frame_data)
                
        except Exception as e:
            logger.error(f"Image processing error: {e}")
        
        return metrics
    
    def _decode_video(self, video_data: bytes) -> List[np.ndarray]:
        """Decode video bytes into frames."""
        frames = []
        
        try:
            # Write to temporary buffer and read with OpenCV
            nparr = np.frombuffer(video_data, np.uint8)
            
            # Try to decode as video
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.mp4', delete=True) as tmp:
                tmp.write(video_data)
                tmp.flush()
                
                cap = cv2.VideoCapture(tmp.name)
                
                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret:
                        break
                    frames.append(frame)
                
                cap.release()
                
        except Exception as e:
            logger.error(f"Video decoding failed: {e}")
        
        return frames
    
    def _process_frames(self, frames: List[np.ndarray]) -> List[Dict[str, Any]]:
        """Process frames and extract per-frame features."""
        frame_data = []
        
        for frame in frames:
            data = {
                'has_face': False,
                'eye_contact': False,
                'head_pose': None,
                'gaze_direction': None,
                'expressions': None
            }
            
            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process with Face Mesh
            results = self.face_mesh.process(rgb_frame)
            
            if results.multi_face_landmarks:
                face_landmarks = results.multi_face_landmarks[0]
                data['has_face'] = True
                
                # Extract head pose
                data['head_pose'] = self._estimate_head_pose(
                    face_landmarks, frame.shape
                )
                
                # Estimate gaze direction
                data['gaze_direction'] = self._estimate_gaze(
                    face_landmarks, frame.shape
                )
                
                # Determine eye contact
                if data['head_pose'] is not None:
                    yaw, pitch, roll = data['head_pose']
                    data['eye_contact'] = (
                        abs(yaw) < self.YAW_THRESHOLD and
                        abs(pitch) < self.PITCH_THRESHOLD
                    )
            
            # Extract expressions using FER
            if self.fer_detector is not None:
                try:
                    emotions = self.fer_detector.detect_emotions(frame)
                    if emotions:
                        data['expressions'] = emotions[0]['emotions']
                except Exception as e:
                    logger.debug(f"Expression detection failed for frame: {e}")
            
            frame_data.append(data)
        
        return frame_data
    
    def _estimate_head_pose(
        self,
        landmarks,
        image_shape: Tuple[int, int, int]
    ) -> Optional[Tuple[float, float, float]]:
        """
        Estimate head pose (yaw, pitch, roll) from face landmarks.
        Returns angles in degrees.
        """
        try:
            h, w = image_shape[:2]
            
            # 3D model points for pose estimation
            model_points = np.array([
                (0.0, 0.0, 0.0),          # Nose tip
                (0.0, -330.0, -65.0),     # Chin
                (-225.0, 170.0, -135.0),  # Left eye left corner
                (225.0, 170.0, -135.0),   # Right eye right corner
                (-150.0, -150.0, -125.0), # Left mouth corner
                (150.0, -150.0, -125.0)   # Right mouth corner
            ], dtype=np.float64)
            
            # 2D image points from landmarks
            landmark_indices = [1, 152, 33, 263, 61, 291]  # Corresponding landmarks
            image_points = np.array([
                (landmarks.landmark[idx].x * w, landmarks.landmark[idx].y * h)
                for idx in landmark_indices
            ], dtype=np.float64)
            
            # Camera matrix
            focal_length = w
            center = (w / 2, h / 2)
            camera_matrix = np.array([
                [focal_length, 0, center[0]],
                [0, focal_length, center[1]],
                [0, 0, 1]
            ], dtype=np.float64)
            
            dist_coeffs = np.zeros((4, 1))
            
            # Solve PnP
            success, rotation_vector, translation_vector = cv2.solvePnP(
                model_points,
                image_points,
                camera_matrix,
                dist_coeffs,
                flags=cv2.SOLVEPNP_ITERATIVE
            )
            
            if not success:
                return None
            
            # Convert rotation vector to Euler angles
            rotation_matrix, _ = cv2.Rodrigues(rotation_vector)
            
            # Extract Euler angles
            sy = np.sqrt(rotation_matrix[0, 0]**2 + rotation_matrix[1, 0]**2)
            singular = sy < 1e-6
            
            if not singular:
                pitch = np.arctan2(rotation_matrix[2, 1], rotation_matrix[2, 2])
                yaw = np.arctan2(-rotation_matrix[2, 0], sy)
                roll = np.arctan2(rotation_matrix[1, 0], rotation_matrix[0, 0])
            else:
                pitch = np.arctan2(-rotation_matrix[1, 2], rotation_matrix[1, 1])
                yaw = np.arctan2(-rotation_matrix[2, 0], sy)
                roll = 0
            
            # Convert to degrees
            return (
                float(np.degrees(yaw)),
                float(np.degrees(pitch)),
                float(np.degrees(roll))
            )
            
        except Exception as e:
            logger.debug(f"Head pose estimation failed: {e}")
            return None
    
    def _estimate_gaze(
        self,
        landmarks,
        image_shape: Tuple[int, int, int]
    ) -> Optional[Tuple[float, float]]:
        """
        Estimate gaze direction from iris landmarks.
        Returns (horizontal_offset, vertical_offset) in normalized coordinates.
        """
        try:
            h, w = image_shape[:2]
            
            # Get iris centers
            if not landmarks.landmark[468].x:  # Check if iris landmarks exist
                return None
            
            # Left iris center
            left_iris = np.mean([
                [landmarks.landmark[idx].x * w, landmarks.landmark[idx].y * h]
                for idx in self.LEFT_IRIS_INDICES
            ], axis=0)
            
            # Right iris center
            right_iris = np.mean([
                [landmarks.landmark[idx].x * w, landmarks.landmark[idx].y * h]
                for idx in self.RIGHT_IRIS_INDICES
            ], axis=0)
            
            # Left eye bounds
            left_eye_left = landmarks.landmark[33].x * w
            left_eye_right = landmarks.landmark[133].x * w
            left_eye_center = (left_eye_left + left_eye_right) / 2
            
            # Right eye bounds
            right_eye_left = landmarks.landmark[362].x * w
            right_eye_right = landmarks.landmark[263].x * w
            right_eye_center = (right_eye_left + right_eye_right) / 2
            
            # Calculate horizontal offset (normalized)
            left_h_offset = (left_iris[0] - left_eye_center) / (left_eye_right - left_eye_left + 1e-6)
            right_h_offset = (right_iris[0] - right_eye_center) / (right_eye_right - right_eye_left + 1e-6)
            
            h_offset = (left_h_offset + right_h_offset) / 2
            
            # Vertical offset (simplified)
            v_offset = 0.0  # Could be extended with eye height analysis
            
            return (float(h_offset), float(v_offset))
            
        except Exception as e:
            logger.debug(f"Gaze estimation failed: {e}")
            return None
    
    def _aggregate_gaze_metrics(
        self,
        metrics: VideoMetrics,
        frame_data: List[Dict[str, Any]]
    ):
        """Aggregate gaze and eye contact metrics."""
        frames_with_face = [f for f in frame_data if f['has_face']]
        
        if not frames_with_face:
            return
        
        # Eye contact ratio
        eye_contact_frames = sum(1 for f in frames_with_face if f['eye_contact'])
        metrics.eye_contact_ratio = eye_contact_frames / len(frames_with_face)
        
        # Gaze variance
        gaze_directions = [
            f['gaze_direction'] for f in frames_with_face 
            if f['gaze_direction'] is not None
        ]
        
        if gaze_directions:
            h_offsets = [g[0] for g in gaze_directions]
            metrics.gaze_variance = float(np.var(h_offsets))
    
    def _aggregate_expression_metrics(
        self,
        metrics: VideoMetrics,
        frame_data: List[Dict[str, Any]]
    ):
        """Aggregate facial expression metrics."""
        expressions = [
            f['expressions'] for f in frame_data 
            if f['expressions'] is not None
        ]
        
        if not expressions:
            return
        
        # Calculate smile and neutral ratios
        smile_scores = [e.get('happy', 0) for e in expressions]
        neutral_scores = [e.get('neutral', 0) for e in expressions]
        
        metrics.smile_ratio = float(np.mean(smile_scores))
        metrics.neutral_face_ratio = float(np.mean(neutral_scores))
        
        # Expression variance (measure of expressiveness)
        all_expression_vectors = []
        for e in expressions:
            vector = [e.get(label, 0) for label in self.EXPRESSION_LABELS]
            all_expression_vectors.append(vector)
        
        if all_expression_vectors:
            expression_matrix = np.array(all_expression_vectors)
            # Variance across time for each emotion, then average
            per_emotion_variance = np.var(expression_matrix, axis=0)
            metrics.expression_variance = float(np.mean(per_emotion_variance))
        
        # Emotion mismatch (high values for conflicting expressions)
        mismatch_scores = []
        for e in expressions:
            positive = e.get('happy', 0) + e.get('surprise', 0)
            negative = e.get('angry', 0) + e.get('sad', 0) + e.get('fear', 0)
            # If both positive and negative are high, there's a mismatch
            mismatch = min(positive, negative) * 2
            mismatch_scores.append(mismatch)
        
        metrics.emotion_mismatch_score = float(np.mean(mismatch_scores))
    
    def _calculate_head_turn_frequency(
        self,
        metrics: VideoMetrics,
        frame_data: List[Dict[str, Any]],
        fps: float
    ):
        """Calculate head turn frequency from head pose data."""
        head_poses = [
            f['head_pose'] for f in frame_data 
            if f['head_pose'] is not None
        ]
        
        if len(head_poses) < 2:
            return
        
        # Extract yaw values
        yaw_values = [p[0] for p in head_poses]
        
        # Count significant head turns (yaw changes > threshold)
        turn_threshold = 10.0  # degrees
        turn_count = 0
        
        for i in range(1, len(yaw_values)):
            if abs(yaw_values[i] - yaw_values[i-1]) > turn_threshold:
                turn_count += 1
        
        # Convert to frequency (turns per second)
        duration = len(frame_data) / fps
        if duration > 0:
            metrics.head_turn_frequency = float(turn_count / duration)
    
    def close(self):
        """Release resources."""
        if self.face_mesh:
            self.face_mesh.close()
