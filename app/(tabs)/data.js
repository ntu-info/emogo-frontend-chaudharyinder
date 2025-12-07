import { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getAllRecords, deleteRecord } from '../../utils/database';

export default function DataScreen() {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const loadRecords = async () => {
        try {
            const data = await getAllRecords();
            setRecords(data);
        } catch (error) {
            console.error('Error loading records:', error);
            Alert.alert('Error', 'Failed to load records.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadRecords();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadRecords();
    };

    const handleDelete = (item) => {
        Alert.alert(
            'Delete Record',
            'Are you sure you want to delete this record?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRecord(item.id);

                            // Delete video file if it exists
                            if (item.videoUri) {
                                try {
                                    await FileSystem.deleteAsync(item.videoUri, { idempotent: true });
                                } catch (fileError) {
                                    console.warn('Could not delete video file:', fileError);
                                }
                            }

                            loadRecords();
                            Alert.alert('Success', 'Record deleted successfully!');
                        } catch (error) {
                            console.error('Error deleting record:', error);
                            Alert.alert('Error', 'Failed to delete record.');
                        }
                    },
                },
            ]
        );
    };

    const handleExport = async () => {
        if (records.length === 0) {
            Alert.alert('No Data', 'There are no records to export.');
            return;
        }

        setIsExporting(true);

        try {
            const jsonData = JSON.stringify(records, null, 2);
            const fileName = `emogo_export_${new Date().toISOString().split('T')[0]}.json`;
            const filePath = `${FileSystem.documentDirectory}${fileName}`;

            await FileSystem.writeAsStringAsync(filePath, jsonData);

            const isAvailable = await Sharing.isAvailableAsync();

            if (isAvailable) {
                await Sharing.shareAsync(filePath, {
                    mimeType: 'application/json',
                    dialogTitle: 'Export EmoGo Data',
                });
            } else {
                Alert.alert('Export Complete', `Data saved to: ${filePath}`);
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            Alert.alert('Error', 'Failed to export data.');
        } finally {
            setIsExporting(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const renderRecord = ({ item }) => (
        <View style={styles.recordCard}>
            <View style={styles.recordHeader}>
                <Text style={styles.recordType}>
                    {item.videoUri ? '📹 Vlog' : '😊 Mood'}
                </Text>
                <View style={styles.recordActions}>
                    <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
                    <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        style={styles.deleteButton}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.deleteButtonText}>🗑️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {item.mood && (
                <Text style={styles.recordMood}>{item.mood}</Text>
            )}

            {item.videoUri && (
                <Text style={styles.recordVideo} numberOfLines={1}>
                    🎬 {item.videoUri.split('/').pop()}
                </Text>
            )}

            {item.placeName && (
                <Text style={styles.recordPlace} numberOfLines={2}>
                    📍 {item.placeName}
                </Text>
            )}

            {(item.latitude && item.longitude) && !item.placeName && (
                <Text style={styles.recordLocation}>
                    📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                </Text>
            )}
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#6366f1" />
                <Text style={styles.loadingText}>Loading records...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {records.length} Record{records.length !== 1 ? 's' : ''}
                </Text>
                <TouchableOpacity
                    style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
                    onPress={handleExport}
                    disabled={isExporting}
                    activeOpacity={0.8}
                >
                    {isExporting ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                        <Text style={styles.exportButtonText}>📤 Export</Text>
                    )}
                </TouchableOpacity>
            </View>

            {records.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyTitle}>No Records Yet</Text>
                    <Text style={styles.emptyText}>
                        Start by saving a mood or recording a vlog!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={records}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRecord}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#6366f1']}
                            tintColor="#6366f1"
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    exportButton: {
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    exportButtonDisabled: {
        backgroundColor: '#a5b4fc',
    },
    exportButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    recordCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    recordHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    recordActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recordType: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6366f1',
    },
    recordDate: {
        fontSize: 12,
        color: '#94a3b8',
    },
    deleteButton: {
        padding: 4,
    },
    deleteButtonText: {
        fontSize: 18,
    },
    recordMood: {
        fontSize: 16,
        color: '#1e293b',
        marginBottom: 8,
        lineHeight: 24,
    },
    recordVideo: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 8,
    },
    recordPlace: {
        fontSize: 13,
        color: '#059669',
        fontWeight: '500',
        lineHeight: 18,
    },
    recordLocation: {
        fontSize: 12,
        color: '#94a3b8',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748b',
        textAlign: 'center',
    },
});
