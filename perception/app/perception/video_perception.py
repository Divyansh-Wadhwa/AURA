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
    
    # Body language metrics
    body_detected_ratio: float = 0.0       # Ratio of frames with body detected
    shoulder_openness: float = 0.0          # 0=closed/hunched, 1=open posture
    gesture_frequency: float = 0.0          # Hand movements per second
    posture_stability: float = 0.0          # 1=stable, 0=fidgety
    forward_lean: float = 0.0               # Positive=leaning forward (engaged)
    hand_to_face_ratio: float = 0.0         # Ratio of time hands near face
    arm_cross_ratio: float = 0.0            # Ratio of time arms crossed
    gesture_amplitude: float = 0.0          # Average gesture size
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "eye_contact_ratio": self.eye_contact_ratio,
            "gaze_variance": self.gaze_variance,
            "head_turn_frequency": self.head_turn_frequency,
            "expression_variance": self.expression_variance,
            "smile_ratio": self.smile_ratio,
            "neutral_face_ratio": self.neutral_face_ratio,
            "emotion_mismatch_score": self.emotion_mismatch_score,
            "body_detected_ratio": self.body_detected_ratio,
            "shoulder_openness": self.shoulder_openness,
            "gesture_frequency": self.gesture_frequency,
            "posture_stability": self.posture_stability,
            "forward_lean": self.forward_lean,
            "hand_to_face_ratio": self.hand_to_face_ratio,
            "arm_cross_ratio": self.arm_cross_ratio,
            "gesture_amplitude": self.gesture_amplitude
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
    
    # MediaPipe Pose landmark indices
    POSE_NOSE = 0
    POSE_LEFT_SHOULDER = 11
    POSE_RIGHT_SHOULDER = 12
    POSE_LEFT_ELBOW = 13
    POSE_RIGHT_ELBOW = 14
    POSE_LEFT_WRIST = 15
    POSE_RIGHT_WRIST = 16
    POSE_LEFT_HIP = 23
    POSE_RIGHT_HIP = 24
    
    def __init__(self):
        # Initialize MediaPipe Face Mesh if available
        self.mp_face_mesh = None
        self.face_mesh = None
        self.mp_pose = None
        self.pose = None
        
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
                
                # Initialize MediaPipe Pose for body language detection
                self.mp_pose = mp.solutions.pose
                self.pose = self.mp_pose.Pose(
                    min_detection_confidence=0.5,
                    min_tracking_confidence=0.5,
                    model_complexity=1  # 0=lite, 1=full, 2=heavy
                )
                logger.info("MediaPipe Pose initialized successfully")
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
            self._aggregate_body_language_metrics(metrics, frame_data, fps)
            
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
                self._aggregate_body_language_metrics(metrics, frame_data, fps)
                
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
                self._aggregate_body_language_metrics(metrics, frame_data, fps=1.0)
                
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
        """Process frames and extract per-frame features including body language."""
        frame_data = []
        
        for frame in frames:
            data = {
                'has_face': False,
                'eye_contact': False,
                'head_pose': None,
                'gaze_direction': None,
                'expressions': None,
                # Body language data
                'has_body': False,
                'pose_landmarks': None,
                'shoulder_width': None,
                'wrist_positions': None,
                'shoulder_center': None,
                'nose_position': None,
                'hip_center': None,
                'elbow_positions': None
            }
            
            # Convert BGR to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w = frame.shape[:2]
            
            # Process with Face Mesh
            if self.face_mesh is not None:
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
            
            # Process with Pose detection for body language
            if self.pose is not None:
                try:
                    pose_results = self.pose.process(rgb_frame)
                    
                    if pose_results.pose_landmarks:
                        landmarks = pose_results.pose_landmarks.landmark
                        data['has_body'] = True
                        data['pose_landmarks'] = landmarks
                        
                        # Extract key body positions (normalized to image size)
                        left_shoulder = landmarks[self.POSE_LEFT_SHOULDER]
                        right_shoulder = landmarks[self.POSE_RIGHT_SHOULDER]
                        left_wrist = landmarks[self.POSE_LEFT_WRIST]
                        right_wrist = landmarks[self.POSE_RIGHT_WRIST]
                        left_elbow = landmarks[self.POSE_LEFT_ELBOW]
                        right_elbow = landmarks[self.POSE_RIGHT_ELBOW]
                        nose = landmarks[self.POSE_NOSE]
                        left_hip = landmarks[self.POSE_LEFT_HIP]
                        right_hip = landmarks[self.POSE_RIGHT_HIP]
                        
                        # Calculate shoulder width (for openness metric)
                        data['shoulder_width'] = abs(right_shoulder.x - left_shoulder.x)
                        
                        # Shoulder center position
                        data['shoulder_center'] = (
                            (left_shoulder.x + right_shoulder.x) / 2,
                            (left_shoulder.y + right_shoulder.y) / 2,
                            (left_shoulder.z + right_shoulder.z) / 2
                        )
                        
                        # Wrist positions for gesture tracking
                        data['wrist_positions'] = (
                            (left_wrist.x * w, left_wrist.y * h),
                            (right_wrist.x * w, right_wrist.y * h)
                        )
                        
                        # Elbow positions for arm cross detection
                        data['elbow_positions'] = (
                            (left_elbow.x, left_elbow.y),
                            (right_elbow.x, right_elbow.y)
                        )
                        
                        # Nose position for forward lean calculation
                        data['nose_position'] = (nose.x, nose.y, nose.z)
                        
                        # Hip center for posture reference
                        data['hip_center'] = (
                            (left_hip.x + right_hip.x) / 2,
                            (left_hip.y + right_hip.y) / 2
                        )
                        
                except Exception as e:
                    logger.debug(f"Pose detection failed for frame: {e}")
            
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
    
    def _aggregate_body_language_metrics(
        self,
        metrics: VideoMetrics,
        frame_data: List[Dict[str, Any]],
        fps: float
    ):
        """Aggregate body language metrics from pose data."""
        frames_with_body = [f for f in frame_data if f['has_body']]
        
        if not frames_with_body:
            return
        
        # Body detection ratio
        metrics.body_detected_ratio = len(frames_with_body) / len(frame_data)
        
        # 1. Shoulder Openness (wider shoulders = more open/confident posture)
        shoulder_widths = [f['shoulder_width'] for f in frames_with_body if f['shoulder_width'] is not None]
        if shoulder_widths:
            # Normalize: typical shoulder width in normalized coords is 0.2-0.4
            avg_width = np.mean(shoulder_widths)
            # Map to 0-1 range (0.15 = very closed, 0.45 = very open)
            metrics.shoulder_openness = float(np.clip((avg_width - 0.15) / 0.30, 0, 1))
        
        # 2. Gesture Frequency (hand movements per second)
        wrist_positions = [f['wrist_positions'] for f in frames_with_body if f['wrist_positions'] is not None]
        if len(wrist_positions) >= 2:
            movement_count = 0
            movement_threshold = 20  # pixels
            
            for i in range(1, len(wrist_positions)):
                prev_left, prev_right = wrist_positions[i-1]
                curr_left, curr_right = wrist_positions[i]
                
                # Calculate movement distance for each hand
                left_dist = np.sqrt((curr_left[0] - prev_left[0])**2 + (curr_left[1] - prev_left[1])**2)
                right_dist = np.sqrt((curr_right[0] - prev_right[0])**2 + (curr_right[1] - prev_right[1])**2)
                
                # Count as gesture if either hand moved significantly
                if left_dist > movement_threshold or right_dist > movement_threshold:
                    movement_count += 1
            
            duration = len(frame_data) / fps
            if duration > 0:
                metrics.gesture_frequency = float(movement_count / duration)
        
        # 3. Gesture Amplitude (average movement size)
        if len(wrist_positions) >= 2:
            all_movements = []
            for i in range(1, len(wrist_positions)):
                prev_left, prev_right = wrist_positions[i-1]
                curr_left, curr_right = wrist_positions[i]
                
                left_dist = np.sqrt((curr_left[0] - prev_left[0])**2 + (curr_left[1] - prev_left[1])**2)
                right_dist = np.sqrt((curr_right[0] - prev_right[0])**2 + (curr_right[1] - prev_right[1])**2)
                all_movements.extend([left_dist, right_dist])
            
            if all_movements:
                # Normalize to 0-1 (0-100 pixels mapped)
                metrics.gesture_amplitude = float(np.clip(np.mean(all_movements) / 100, 0, 1))
        
        # 4. Posture Stability (low variance = stable, high = fidgety)
        shoulder_centers = [f['shoulder_center'] for f in frames_with_body if f['shoulder_center'] is not None]
        if len(shoulder_centers) >= 2:
            x_positions = [sc[0] for sc in shoulder_centers]
            y_positions = [sc[1] for sc in shoulder_centers]
            
            # Calculate position variance
            position_variance = np.var(x_positions) + np.var(y_positions)
            
            # Invert: low variance = high stability (1), high variance = low stability (0)
            # Typical variance range: 0 to 0.01
            metrics.posture_stability = float(np.clip(1 - (position_variance * 100), 0, 1))
        
        # 5. Forward Lean (nose position relative to shoulders indicates engagement)
        forward_leans = []
        for f in frames_with_body:
            if f['nose_position'] is not None and f['shoulder_center'] is not None:
                nose_z = f['nose_position'][2]
                shoulder_z = f['shoulder_center'][2]
                # Positive = leaning forward (nose closer to camera than shoulders)
                lean = shoulder_z - nose_z
                forward_leans.append(lean)
        
        if forward_leans:
            # Normalize: typical range -0.1 to 0.1
            avg_lean = np.mean(forward_leans)
            metrics.forward_lean = float(np.clip(avg_lean * 5, -1, 1))
        
        # 6. Hand to Face Ratio (hands near face = nervousness indicator)
        hand_to_face_frames = 0
        for f in frames_with_body:
            if f['wrist_positions'] is not None and f['nose_position'] is not None:
                left_wrist, right_wrist = f['wrist_positions']
                nose_y = f['nose_position'][1]
                
                # Check if either hand is at face level (wrist y close to nose y)
                # In normalized coords, nose_y is typically 0.3-0.5
                left_near_face = abs(left_wrist[1] / 480 - nose_y) < 0.15  # Assuming ~480px height
                right_near_face = abs(right_wrist[1] / 480 - nose_y) < 0.15
                
                if left_near_face or right_near_face:
                    hand_to_face_frames += 1
        
        if frames_with_body:
            metrics.hand_to_face_ratio = float(hand_to_face_frames / len(frames_with_body))
        
        # 7. Arm Cross Ratio (elbows crossed in front = defensive posture)
        arm_cross_frames = 0
        for f in frames_with_body:
            if f['elbow_positions'] is not None and f['shoulder_center'] is not None:
                left_elbow, right_elbow = f['elbow_positions']
                shoulder_center_x = f['shoulder_center'][0]
                
                # Arms crossed when elbows are on opposite sides of center
                left_crossed = left_elbow[0] > shoulder_center_x
                right_crossed = right_elbow[0] < shoulder_center_x
                
                if left_crossed and right_crossed:
                    arm_cross_frames += 1
        
        if frames_with_body:
            metrics.arm_cross_ratio = float(arm_cross_frames / len(frames_with_body))
    
    def close(self):
        """Release resources."""
        if self.face_mesh:
            self.face_mesh.close()
        if self.pose:
            self.pose.close()
