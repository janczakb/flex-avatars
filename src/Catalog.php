<?php

declare(strict_types=1);

namespace UseFlex\Avatars;

use RuntimeException;

final class Catalog
{
    /** @var list<array{id: string, label: string, count: int}>|null */
    private ?array $collections = null;

    /** @var array<string, array<string, array{id: string, collection: string, image: string, preview: string}>> */
    private array $avatars = [];

    public static function assetsPath(): string
    {
        return dirname(__DIR__).'/assets';
    }

    /** @return list<array{id: string, label: string, count: int}> */
    public function collections(): array
    {
        return $this->collections ??= self::read('catalog.json')['collections'];
    }

    /** @return list<array{id: string, collection: string, image: string, preview: string}> */
    public function avatars(string $collection): array
    {
        return array_values($this->index($collection));
    }

    /** @return array{id: string, collection: string, image: string, preview: string}|null */
    public function find(string $id): ?array
    {
        $parts = explode('/', $id);
        if (count($parts) !== 2) {
            return null;
        }

        return $this->index($parts[0])[$id] ?? null;
    }

    /** @return array{id: string, collection: string, image: string, preview: string}|null */
    public function pick(string $seed, ?string $collection = null): ?array
    {
        $collections = $this->collections();
        if ($collection !== null) {
            $collections = array_filter($collections, static fn (array $item): bool => $item['id'] === $collection);
        }

        $total = array_sum(array_column($collections, 'count'));
        if ($total === 0) {
            return null;
        }

        $offset = (int) hexdec(substr(hash('sha256', $seed), 0, 7)) % $total;
        foreach ($collections as $item) {
            if ($offset < $item['count']) {
                return $this->avatars($item['id'])[$offset];
            }
            $offset -= $item['count'];
        }

        return null;
    }

    /** @return array<string, array{id: string, collection: string, image: string, preview: string}> */
    private function index(string $collection): array
    {
        if (isset($this->avatars[$collection])) {
            return $this->avatars[$collection];
        }

        if (! in_array($collection, array_column($this->collections(), 'id'), true)) {
            return [];
        }

        $index = [];
        foreach (self::read($collection.'/catalog.json') as $item) {
            $id = $collection.'/'.$item['id'];
            $index[$id] = [
                'id' => $id,
                'collection' => $collection,
                'image' => $item['image'],
                'preview' => $item['preview'],
            ];
        }

        return $this->avatars[$collection] = $index;
    }

    private static function read(string $path): array
    {
        $contents = file_get_contents(self::assetsPath().'/'.$path);
        if ($contents === false) {
            throw new RuntimeException('Unable to read the FLEX Avatars catalogue.');
        }

        return json_decode($contents, true, flags: JSON_THROW_ON_ERROR);
    }
}
