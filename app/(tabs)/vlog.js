import { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
import { insertRecord, getAllRecords } from '../../utils/database';

export default function VlogScreen() {
    const { mood } = useLocalSearchParams();
    const router = useRouter();
    const [permission, requestPermission] = useCameraPermissions();
    const [isRecording, setIsRecording] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const cameraRef = useRef(null);

    const handleRecordVideo = async () => {
        if (!cameraRef.current) {
            Alert.alert('Error', 'Camera is not ready.');
            return;
        }

        setIsRecording(true);

        try {
            // Start recording with 1 second max duration
            const video = await cameraRef.current.recordAsync({
                maxDuration: 1,
            });

            setIsRecording(false);
            setIsSaving(true);

            // Get location permission and current location
            const { status } = await Location.requestForegroundPermissionsAsync();

            let latitude = null;
            let longitude = null;
            let placeName = null;

            if (status === 'granted') {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                latitude = location.coords.latitude;
                longitude = location.coords.longitude;

                // Reverse geocoding to get place name
                try {
                    const addresses = await Location.reverseGeocodeAsync({
                        latitude,
                        longitude,
                    });

                    if (addresses && addresses.length > 0) {
                        const address = addresses[0];
                        // Build place name from available components
                        const parts = [
                            address.name,
                            address.city || address.subregion,
                            address.region,
                            address.country,
                        ].filter(Boolean);
                        placeName = parts.join(', ');
                    }
                } catch (geoError) {
                    console.warn('Reverse geocoding failed:', geoError);
                }
            }

            // Get all existing records to determine next video number
            const existingRecords = await getAllRecords();
            const videoCount = existingRecords.filter(r => r.videoUri).length;
            const videoNumber = videoCount + 1;
            const newFileName = `video${videoNumber}.mov`;
            const newFilePath = `${FileSystem.documentDirectory}${newFileName}`;

            // Copy video to app directory with new name
            await FileSystem.copyAsync({
                from: video.uri,
                to: newFilePath,
            });

            // Save to database with mood and place name
            await insertRecord({
                date: new Date().toISOString(),
                mood: mood || null,
                latitude,
                longitude,
                placeName,
                videoUri: newFilePath,
            });

            Alert.alert('Success', 'Your mood and vlog have been saved!');

            // Navigate back to home and clear the mood
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error recording video:', error);
            Alert.alert('Error', 'Failed to record or save video. Please try again.');
        } finally {
            setIsRecording(false);
            setIsSaving(false);
        }
    };

    const stopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
        }
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#6366f1" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.emoji}>📹</Text>
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionText}>
                    We need camera and microphone access to record your vlogs.
                </Text>
                <TouchableOpacity
                    style={styles.permissionButton}
                    onPress={requestPermission}
                    activeOpacity={0.8}
                >
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="front"
                mode="video"
            >
                <View style={styles.overlay}>
                    <View style={styles.header}>
                        {mood && (
                            <View style={styles.moodBadge}>
                                <Text style={styles.moodLabel}>Your Mood:</Text>
                                <Text style={styles.moodText}>{mood}</Text>
                            </View>
                        )}
                        <Text style={styles.headerText}>
                            {isRecording ? '🔴 Recording...' : '📹 Ready to Record'}
                        </Text>
                    </View>

                    <View style={styles.controls}>
                        {isSaving ? (
                            <View style={styles.savingContainer}>
                                <ActivityIndicator size="large" color="#ffffff" />
                                <Text style={styles.savingText}>Saving vlog...</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[
                                    styles.recordButton,
                                    isRecording && styles.recordButtonActive,
                                ]}
                                onPress={isRecording ? stopRecording : handleRecordVideo}
                                activeOpacity={0.7}
                            >
                                <View
                                    style={[
                                        styles.recordButtonInner,
                                        isRecording && styles.recordButtonInnerActive,
                                    ]}
                                />
                            </TouchableOpacity>
                        )}
                        <Text style={styles.instructionText}>
                            {isRecording
                                ? 'Recording 1s video...'
                                : mood ? `Record a vlog about: "${mood}"` : 'Tap to record a 1-second vlog'}
                        </Text>
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'space-between',
    },
    header: {
        paddingTop: 20,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    moodBadge: {
        backgroundColor: 'rgba(99,102,241,0.9)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        marginBottom: 12,
        maxWidth: '90%',
    },
    moodLabel: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    moodText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    headerText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    controls: {
        alignItems: 'center',
        paddingBottom: 50,
    },
    recordButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    recordButtonActive: {
        backgroundColor: 'rgba(239,68,68,0.3)',
        borderColor: '#ef4444',
    },
    recordButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#ef4444',
    },
    recordButtonInnerActive: {
        width: 30,
        height: 30,
        borderRadius: 6,
    },
    instructionText: {
        color: '#ffffff',
        fontSize: 16,
        marginTop: 16,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    savingContainer: {
        alignItems: 'center',
    },
    savingText: {
        color: '#ffffff',
        fontSize: 16,
        marginTop: 12,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 24,
    },
    emoji: {
        fontSize: 64,
        marginBottom: 24,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 12,
    },
    permissionText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    permissionButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
